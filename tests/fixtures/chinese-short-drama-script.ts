import type { PlotBeatRecord } from "../../src/lib/types.ts";

type ChineseShortDramaFixture = {
  id: string;
  title: string;
  script: string;
  expected: {
    characterNames: string[];
    sceneNumbers: number[];
    locations: string[];
    timeOfDays: string[];
    moods: string[];
    cameras: string[];
    dialogueSpeakers: string[];
    plotBeatTypes: PlotBeatRecord["type"][];
  };
};

export const chineseShortDramaFixtures: ChineseShortDramaFixture[] = [
  {
    id: "contract-reversal",
    title: "旧合同反转",
    script: [
      "场景一：旧城区咖啡馆｜夜晚｜压抑",
      "镜头：手持近景，雨水贴着玻璃滑落。",
      "林夏（28岁，编剧，敏感）在雨声中修改短剧大纲。",
      "顾沉（32岁，制片人，冷静）带着投资合同出现，两人因为三年前的误会再次争执。",
      "林夏：你现在出现，是想买走我的故事吗？",
      "顾沉：我只是想把当年的真相还给你。",
      "",
      "场景2：咖啡馆后巷 / 深夜",
      "氛围：悬疑",
      "林夏发现合同背面夹着母亲的旧照片，意识到顾沉一直在暗中帮她。",
      "顾沉承认自己当年隐瞒真相，是为了保护她的剧本版权。",
      "林夏：所以你不是背叛我？",
      "",
      "场景3：天台，清晨，释然",
      "运镜：缓慢拉远，城市天光露出。",
      "林夏（坚定）决定重新合作，把真实经历写成短剧第一集。",
      "顾沉（克制）承诺公开当年的证据。",
      "顾沉：这一次，署名只属于你。",
    ].join("\n"),
    expected: {
      characterNames: ["林夏", "顾沉"],
      sceneNumbers: [1, 2, 3],
      locations: ["旧城区咖啡馆", "咖啡馆后巷", "天台"],
      timeOfDays: ["夜晚", "深夜", "清晨"],
      moods: ["压抑", "悬疑", "释然"],
      cameras: ["手持近景，雨水贴着玻璃滑落。", "待设置", "缓慢拉远，城市天光露出。"],
      dialogueSpeakers: ["林夏", "顾沉", "林夏", "顾沉"],
      plotBeatTypes: ["conflict", "reversal", "decision"],
    },
  },
  {
    id: "hospital-hearing",
    title: "病历听证会",
    script: [
      "第一场：医院走廊 — 清晨 — 焦灼",
      "机位：低角度固定镜头。",
      "许念（30岁，医生，克制）拿着报告拒绝签字。",
      "周砚（33岁，律师，冷静）发现病历编号被调换，意识到旧案真相。",
      "许念：如果这份报告是真的，我父亲当年就不是意外。",
      "周砚：我会把证据带到听证会。",
      "",
      "场景二：听证会门外 / 下午",
      "气氛：紧张",
      "许念（坚定）决定公开录音。",
      "周砚（谨慎）承诺保护她。",
      "周砚：进去之后，我先发问。",
    ].join("\n"),
    expected: {
      characterNames: ["许念", "周砚"],
      sceneNumbers: [1, 2],
      locations: ["医院走廊", "听证会门外"],
      timeOfDays: ["清晨", "下午"],
      moods: ["焦灼", "紧张"],
      cameras: ["低角度固定镜头。", "待设置"],
      dialogueSpeakers: ["许念", "周砚", "周砚"],
      plotBeatTypes: ["conflict", "decision"],
    },
  },
  {
    id: "garage-livestream",
    title: "车库直播反击",
    script: [
      "场景十：地下车库深夜",
      "画面：手持跟拍，车灯扫过墙面。",
      "江澄（25岁，主播，冲动）发现直播回放里出现隐藏摄像头。",
      "陆遥（27岁，剪辑师，谨慎）选择立刻备份证据。",
      "江澄：他们一直在看着我们？",
      "",
      "场景十一：直播间 - 夜晚 - 紧张",
      "镜头：固定中景，弹幕快速滚动。",
      "江澄（愤怒）威胁公开赞助商名单。",
      "陆遥（冷静）决定切换到备用账号。",
      "陆遥：三秒后开播。",
    ].join("\n"),
    expected: {
      characterNames: ["江澄", "陆遥"],
      sceneNumbers: [10, 11],
      locations: ["地下车库", "直播间"],
      timeOfDays: ["深夜", "夜晚"],
      moods: ["悬疑", "紧张"],
      cameras: ["手持跟拍，车灯扫过墙面。", "固定中景，弹幕快速滚动。"],
      dialogueSpeakers: ["江澄", "陆遥"],
      plotBeatTypes: ["reversal", "conflict"],
    },
  },
];

export const chineseShortDramaScript = chineseShortDramaFixtures[0].script;
