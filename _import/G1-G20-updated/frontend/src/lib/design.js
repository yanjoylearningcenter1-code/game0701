// Design tokens & shared image URLs from /app/design_guidelines.json
export const ASSETS = {
  hero: "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/4d1c4412c0db8eb926168ed4c837ed65609fd13aba3c6108f8361583dc6f7e50.png",
  student: "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/e107b7c106d7f97f7b92fe570b755516063dd742f39bda9bfdc80c5213b92569.png",
  parent: "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/987e9a1d69803b87fa479a643b0520655a522c8361dafedb4f2a26b2e6e3001d.png",
  teacher: "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/8d82900a1847a03f1fce8b9e38d362729bd7947de1accea5aed70d1729c95e85.png",
  cameraBg: "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/6e359f7aeed7399df32d3f855ac94ea52eda4c4f129027368e87bbc2b194f29c.png",
  boss: "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/5ebfb4090fa6c80b07c42cecf7edb828703141e03a55306d0d9ff91931ba91aa.png",
  worldMap: "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/fb2a9fe3bdb1a067d60f4a31b84027120084335d5995788dca166ce209fd8337.png",
};

export const MODES = [
  { id: "reading_dictation", title: "讀默", subtitle: "Memory Mist Battle", color: "from-sky-400 to-blue-600", icon: "📖" },
  { id: "recital_dictation", title: "背默", subtitle: "Expedition Trial", color: "from-violet-400 to-purple-600", icon: "🗡️" },
  { id: "quiz", title: "Quiz", subtitle: "Lightning Challenge", color: "from-amber-400 to-orange-500", icon: "⚡" },
  { id: "exam", title: "Exam", subtitle: "Ultimate Trial", color: "from-rose-400 to-red-600", icon: "🔥" },
];

export function Particles({ count = 28 }) {
  const parts = Array.from({ length: count }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 8;
    const dur = 8 + Math.random() * 8;
    const size = 4 + Math.random() * 10;
    return (
      <span
        key={i}
        className="particle"
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: `${delay}s`,
          animationDuration: `${dur}s`,
        }}
      />
    );
  });
  return <div className="absolute inset-0 overflow-hidden pointer-events-none">{parts}</div>;
}
