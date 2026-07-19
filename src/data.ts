import type {Food,Gift,Npc,Species} from "./types";
const S=(id:string,name:string,en:string,stage:Species["stage"],color:string,accent:string,shape:number,description:string,favoriteFood:string,favoriteGift:string,personality:Species["personality"],weight:[number,number],from:string[],hint:string):Species=>({id,name,en,stage,color,accent,shape,description,favoriteFood,favoriteGift,personality,weight,from,hint});
export const species:Species[]=[
S("stardust-egg","星塵蛋","Stardust Egg","egg","#fff5c9","#d989b5",0,"盛載一點星光的小小蛋。","星星飯糰","星星髮夾","平靜",[2,3],[],"耐心陪伴，星光很快會回應你。"),
S("pomu","波波","Pomu","baby","#f8d7ef","#9d79c7",1,"像泡泡一樣彈跳的初生萌寵。","草莓牛奶","毛公仔","活潑",[3,4],["stardust-egg"],"均衡照顧會打開更多成長道路。"),
S("berrybun","莓莓兔","Berrybun","child","#ef8eb8","#fff5c9",2,"耳尖像莓果的好奇小兔。","草莓牛奶","紅色緞帶","活潑",[5,7],["pomu"],"牠最近很喜歡運動。"),
S("cloudkit","雲朵貓","Cloudkit","child","#e8e5ff","#8ad7c1",3,"尾巴軟綿綿的雲朵小貓。","奶油蔬菜湯","月亮吊墜","平靜",[5,7],["pomu"],"安靜陪伴會讓牠更安心。"),
S("bloompup","花芽犬","Bloompup","child","#f4c58b","#86c98f",4,"頭上冒出花芽的親人小狗。","星星飯糰","小盆栽","溫柔",[6,8],["pomu"],"乾淨的環境令牠感到安心。"),
S("starlamb","星星羊","Starlamb","child","#fff3d6","#c69be2",5,"捲毛會映出微光的小羊。","愛心蛋包飯","星星髮夾","害羞",[5,7],["pomu"],"溫柔的陪伴會帶來驚喜。"),
S("ribbonbun","緞帶兔","Ribbonbun","teen","#ef9fc4","#c45b91",6,"奔跑時耳朵像緞帶飛舞。","星星飯糰","紅色緞帶","活潑",[8,11],["berrybun"],"保持活躍，也別忘記好好休息。"),
S("sugarfox","糖霜狐","Sugarfox","teen","#f4b28c","#fff0f6",7,"尾尖像糖霜的俏皮狐狸。","水果啫喱","毛公仔","幽默",[8,11],["berrybun"],"牠似乎對甜食特別有興趣。"),
S("moonmew","月光貓","Moonmew","teen","#9f97d7","#f7e99d",8,"額上藏著彎月光芒的貓。","奶油蔬菜湯","月亮吊墜","平靜",[8,10],["cloudkit"],"平靜規律的生活適合牠。"),
S("pearlseal","珍珠海豹","Pearlseal","teen","#b9e5e8","#f8d7ef",9,"捧著珍珠、喜歡打滾的小海豹。","草莓牛奶","音樂盒","溫柔",[9,12],["cloudkit"],"快樂與清潔一樣重要。"),
S("bloomdeer","花冠鹿","Bloomdeer","teen","#d6b18b","#e99bbd",10,"鹿角長出四季小花。","奶油蔬菜湯","花束","優雅",[9,12],["bloompup"],"健康的生活可能帶來意想不到的成長。"),
S("starpup","天星犬","Starpup","teen","#e6b97c","#7bc8bd",11,"守護夜空的忠心小狗。","愛心蛋包飯","遊戲代幣","活潑",[10,13],["bloompup","starlamb"],"牠想和你一起挑戰新紀錄。"),
S("rosette","玫瑰公主兔","Rosette","adult","#df709e","#ffe9b5",12,"以玫瑰與勇氣守護伙伴。","草莓牛奶","紅色緞帶","優雅",[12,16],["ribbonbun"],"充滿愛的照顧令牠閃閃發亮。"),
S("aurora","極光狐狸","Aurora","adult","#8ccfd2","#d996dc",13,"尾巴拖曳柔和極光。","水果啫喱","寶石戒指","幽默",[12,16],["sugarfox"],"偶爾放鬆也是健康的一部分。"),
S("celestia","星月貓","Celestia","adult","#7d79bd","#ffe68d",14,"收集星月故事的神秘貓。","奶油蔬菜湯","月亮吊墜","平靜",[11,15],["moonmew"],"牠珍惜每一次安靜陪伴。"),
S("opaline","蛋白石海豹","Opaline","adult","#a9dfe0","#edb1ce",15,"身上閃著蛋白石色澤。","草莓牛奶","音樂盒","溫柔",[13,17],["pearlseal"],"快樂回憶會成為牠的光。"),
S("florielle","花神小鹿","Florielle","adult","#d8b58d","#83c895",16,"走過的地方會開出小花。","奶油蔬菜湯","花束","優雅",[13,17],["bloomdeer"],"整潔與健康會滋養花冠。"),
S("honeybell","蜜糖小熊","Honeybell","adult","#d9a864","#f5d77d",17,"胸前掛著暖黃色小鈴鐺。","愛心蛋包飯","毛公仔","溫柔",[14,18],["starpup","sugarfox"],"牠最珍惜你的陪伴。"),
S("velvet","絲絨蝙蝠","Velvet","adult","#775f91","#e6a0c1",18,"害羞但善良的夜行小伙伴。","水果啫喱","小故事書","害羞",[10,14],["moonmew","starlamb"],"慢慢來，牠會在夜裡綻放自信。"),
S("mallow","雲上公主","Mallow","adult","#eee6fa","#ef9bbf",19,"乘著軟綿雲朵旅行的夢想家。","星星飯糰","星星髮夾","平靜",[11,15],["pearlseal","starlamb"],"均衡的愛會引領牠走向雲端。")];
export const foods:Food[]=[
{id:"rice",name:"星星飯糰",kind:"meal",price:5,fullness:25,happiness:2,weight:.4,health:1,icon:"★"},{id:"soup",name:"奶油蔬菜湯",kind:"meal",price:8,fullness:18,happiness:2,weight:.1,health:4,icon:"♨"},{id:"milk",name:"草莓牛奶",kind:"meal",price:7,fullness:15,happiness:5,weight:.3,health:1,icon:"▣"},{id:"omelette",name:"愛心蛋包飯",kind:"meal",price:12,fullness:30,happiness:4,weight:.6,health:2,icon:"♥"},{id:"cookie",name:"心心曲奇",kind:"snack",price:4,fullness:8,happiness:10,weight:.5,health:0,icon:"♡"},{id:"candy",name:"彩虹糖",kind:"snack",price:5,fullness:5,happiness:12,weight:.4,health:0,icon:"◆"},{id:"jelly",name:"水果啫喱",kind:"snack",price:6,fullness:7,happiness:8,weight:.2,health:1,icon:"●"}];
export const gifts:Gift[]=[
["ribbon","紅色緞帶",18,"common","俏麗的經典配飾",["noa"],5,"🎀"],["clip","星星髮夾",20,"common","一閃一閃的小髮夾",["aro"],6,"★"],["bouquet","花束",25,"uncommon","帶著清新香氣",["milo","mori"],8,"✿"],["music","音樂盒",35,"rare","播放柔和像素旋律",[],8,"♫"],["plush","毛公仔",22,"common","軟綿綿的好朋友",["pico"],7,"♣"],["pendant","月亮吊墜",35,"rare","像夜空一樣溫柔",["roshi"],10,"☾"],["book","小故事書",16,"common","裝滿星光故事",["roshi"],7,"▤"],["ring","寶石戒指",80,"special","向摯愛許下承諾",["noa"],12,"◇"],["token","遊戲代幣",15,"common","一起挑戰新紀錄",["aro","pico"],7,"◎"],["plant","小盆栽",20,"uncommon","每天長出一點綠意",["milo","mori"],8,"♠"]
].map(([id,name,price,rarity,description,preferredBy,affectionValue,icon])=>({id,name,price,rarity,description,preferredBy,affectionValue,icon} as Gift));
export const npcs:Npc[]=[
{id:"aro",name:"阿洛",en:"Aro",personality:"活潑",likes:["token","clip"],dislikes:["book"],color:"#e9986f",dialogue:["今晚一起追星星嗎？","新紀錄就在前面！"]},{id:"milo",name:"米洛",en:"Milo",personality:"溫柔",likes:["bouquet","plant"],dislikes:["token"],color:"#8cc9b0",dialogue:["慢慢來，我一直都在。","今天的花開得很好。"]},{id:"roshi",name:"洛希",en:"Roshi",personality:"害羞",likes:["book","pendant"],dislikes:["token"],color:"#aa8fc7",dialogue:["我找到一個很美的故事……","月光很適合安靜聊天。"]},{id:"noa",name:"諾亞",en:"Noa",personality:"優雅",likes:["ribbon","ring"],dislikes:["candy"],color:"#cf739b",dialogue:["今天也要閃閃發亮。","品味來自真心。"]},{id:"mori",name:"森森",en:"Mori",personality:"平靜",likes:["plant","bouquet"],dislikes:["candy"],color:"#789d70",dialogue:["風正在唱一首慢歌。","照顧植物，也要照顧自己。"]},{id:"pico",name:"皮可",en:"Pico",personality:"幽默",likes:["plush","token"],dislikes:["ring"],color:"#e2a04c",dialogue:["笑一笑，星星幣不會掉！","來比比誰跳得高！"]}];
export const stageMinutes={egg:1,baby:180,child:720,teen:2160} as const;
export const bySpecies=(id:string)=>species.find(s=>s.id===id)??species[0]!;
