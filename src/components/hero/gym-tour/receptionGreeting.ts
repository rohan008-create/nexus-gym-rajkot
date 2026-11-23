import * as THREE from 'three';

// A chest-height greeting in the host's local frame. Both arms solve to
// matching wrist targets instead of approximating contact with bone angles.
export function createReceptionGreeting(avatar: THREE.Object3D) {
  avatar.updateMatrixWorld(true);
  const v = () => new THREE.Vector3();
  const q = () => new THREE.Quaternion();
  const start = v(), current = v(), desired = v();
  const rotation = q(), world = q(), inverse = q();
  const aim = (bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) => {
    bone.getWorldPosition(start);
    child.getWorldPosition(current).sub(start).normalize();
    desired.subVectors(target, start).normalize();
    rotation.setFromUnitVectors(current, desired);
    bone.getWorldQuaternion(world).premultiply(rotation);
    bone.parent!.getWorldQuaternion(inverse).invert();
    bone.quaternion.copy(inverse.multiply(world));
  };
  const bones: { bone: THREE.Object3D; rest: THREE.Quaternion }[] = [];
  avatar.traverse(bone => { if ((bone as THREE.Bone).isBone) bones.push({ bone, rest: bone.quaternion.clone() }); });
  const arms = ['Left', 'Right'].map((side, i) => {
    const get = (name: string) => avatar.getObjectByName(`mixamorig${side}${name}`)!;
    const upper = get('Arm'), lower = get('ForeArm'), hand = get('Hand');
    const a = upper.getWorldPosition(v()), b = lower.getWorldPosition(v()), c = hand.getWorldPosition(v());
    const restWrist = c.clone();
    const fingers = get('HandMiddle1').getWorldPosition(v()).sub(c).normalize();
    const across = get('HandIndex1').getWorldPosition(v()).sub(get('HandPinky1').getWorldPosition(v())).normalize();
    across.addScaledVector(fingers, -across.dot(fingers)).normalize();
    const normal = v().crossVectors(across, fingers).normalize();
    const bindBasis = q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, fingers, normal));
    const joints = ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb'].flatMap(finger => [1, 2].map(joint => ({
      bone: get(`Hand${finger}${joint}`), child: get(`Hand${finger}${joint + 1}`), thumb: finger === 'Thumb',
    })));
    return { upper, lower, hand, sign: i === 0 ? 1 : -1, l1: a.distanceTo(b), l2: b.distanceTo(c),
      restWrist, handRotation: hand.getWorldQuaternion(q()), bindBasis, joints, target: v(), elbow: v(), pole: v(), direction: v(), bend: v() };
  });
  const facing = q(), targetBasis = q(), palmRotation = q();
  const head = avatar.getObjectByName('mixamorigHead');
  return (anchor: THREE.Group, amount: number) => {
    for (const { bone, rest } of bones) bone.quaternion.copy(rest);
    anchor.getWorldQuaternion(facing);
    // Fingers point up, thumbs toward the chest; the mirrored hands place
    // their palms against each other with a small gap for the skin thickness.
    targetBasis.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      v().set(0, 0, -1).applyQuaternion(facing), v().set(0, 1, 0), v().set(1, 0, 0).applyQuaternion(facing),
    ));
    let error = 0;
    for (const arm of arms) {
      const { upper, lower, hand, sign, l1, l2, target, elbow, pole, direction, bend } = arm;
      target.copy(arm.restWrist).lerp(pole.set(sign * .023, 1.18, .29), amount);
      anchor.localToWorld(target);
      upper.getWorldPosition(start);
      direction.subVectors(target, start);
      const distance = THREE.MathUtils.clamp(direction.length(), Math.abs(l1 - l2) + .001, l1 + l2 - .001);
      direction.normalize();
      pole.set(sign * .4, -.7, .05).applyQuaternion(facing);
      bend.copy(pole).addScaledVector(direction, -pole.dot(direction)).normalize();
      const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
      elbow.copy(start).addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
      aim(upper, lower, elbow); aim(lower, hand, target);
      palmRotation.copy(targetBasis).multiply(arm.bindBasis.clone().invert()).multiply(arm.handRotation);
      hand.getWorldQuaternion(world).slerp(palmRotation, amount);
      hand.parent!.getWorldQuaternion(inverse).invert();
      hand.quaternion.copy(inverse.multiply(world));
      error = Math.max(error, hand.getWorldPosition(current).distanceTo(target));
      // The source's relaxed fingers are curled. Extend the finger chains for
      // a flat-palm namaskar rather than interlocking the fingertips.
      for (const { bone, child, thumb } of arm.joints) {
        bone.getWorldPosition(elbow);
        child.getWorldPosition(direction).sub(elbow).normalize();
        pole.set(0, 1, thumb ? -.35 : 0).normalize().applyQuaternion(facing);
        direction.lerp(pole, amount).normalize();
        target.copy(elbow).add(direction);
        aim(bone, child, target);
      }
    }
    if (head) {
      head.getWorldQuaternion(world);
      rotation.setFromAxisAngle(current.set(1, 0, 0).applyQuaternion(facing), .12 * amount);
      world.premultiply(rotation);
      head.parent!.getWorldQuaternion(inverse).invert();
      head.quaternion.copy(inverse.multiply(world));
    }
    return error;
  };
}
