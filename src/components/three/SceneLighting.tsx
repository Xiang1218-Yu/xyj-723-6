// 场景灯光：多组主光、补光、轮廓光，确保不同粗糙度/清漆/绒面的材质
// 在直接光照下表现出明显的高光与哑光差异
export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#ffffff" />

      {/* 主光源（暖色，右上前方），产生主要的明暗和高光 */}
      <directionalLight
        position={[3, 4, 4]}
        intensity={1.8}
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

      {/* 冷色补光（左侧），减弱阴影 */}
      <directionalLight
        position={[-4, 2, 3]}
        intensity={0.6}
        color="#D8E8FF"
      />

      {/* 前方正面光：在服装正面形成高光，凸显丝绸镜面/棉质哑光差异 */}
      <directionalLight
        position={[0, 2, 5]}
        intensity={1.2}
        color="#FFFFFF"
      />

      {/* 后方轮廓光 */}
      <pointLight
        position={[0, 3, -3]}
        intensity={0.6}
        color="#FFFFFF"
        distance={10}
      />

      {/* 右侧暖色点光，增强立体感 */}
      <pointLight
        position={[2, 1, 2]}
        intensity={0.5}
        color="#FFE8D8"
        distance={8}
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
