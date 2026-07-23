export function Ground() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.2, 0]}
      receiveShadow
    >
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial
        color="#1A1A1A"
        roughness={0.9}
        metalness={0.3}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}
