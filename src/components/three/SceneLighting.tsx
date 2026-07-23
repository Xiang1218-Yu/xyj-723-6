export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffffff" />

      <directionalLight
        position={[3, 4, 2]}
        intensity={1.2}
        color="#FFF5E6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0001}
      />

      <directionalLight
        position={[-3, 2, 2]}
        intensity={0.6}
        color="#E6F0FF"
      />

      <pointLight
        position={[0, 3, -3]}
        intensity={0.8}
        color="#FFFFFF"
        distance={10}
      />

      <pointLight
        position={[-2, 1, -2]}
        intensity={0.3}
        color="#FFE4E1"
        distance={8}
      />

      <hemisphereLight
        color="#E6F0FF"
        groundColor="#1A1A1A"
        intensity={0.3}
      />
    </>
  );
}
