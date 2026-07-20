import {beforeEach,describe,expect,it} from "vitest";
import {foods,shopItems} from "../data";
import {advanceTime,applyGameResult,calculateLifeExpectancy,careScore,cleanPet,completeCoPlay,createGame,createPet,feedPet,memorialize,petPet,placePlant,purchaseItem,rebirth,startCoPlay,talkToNpc,useMedicine,waterPlant} from "../engine";
import {db,importSave,loadSave,persistSave} from "../db";
import {migrateSaveV1} from "../migrations";
import {drawSpeciesSprite} from "../sprites";
import {bySpecies} from "../data";
import type {Pet,SaveFile} from "../types";

const food=(id:string)=>foods.find(f=>f.id===id)!;
const makeSave=(pet=createPet(0)):SaveFile=>({schemaVersion:2,exportedAt:0,pet,game:createGame(0),inventory:[],relationships:[{npcId:"aro",affection:0,gifts:[]}],album:[pet.speciesId],albumEntries:[{speciesId:pet.speciesId,unlockedAt:0,raisedCount:1}],achievements:["starter"],settings:{theme:"mint"},npcProgress:{aro:{stage:"baby",unlockedLooks:["baby"],coPlayRewardsToday:0}},unlockedDecor:[],equippedDecor:[],plantState:{owned:false,placed:false,growth:0},legacyTraits:{unlocked:[]},evolutionHistory:[],itemDefinitionsVersion:2});

describe("階段計時與生命週期",()=>{
 it("1. 蛋 1 分鐘後孵化",()=>expect(advanceTime(createPet(0),60000).pet.stage).toBe("baby"));
 it("2. 嬰兒完整 3 小時後進化",()=>expect(advanceTime(createPet(0),181*60000).pet.stage).toBe("child"));
 it("3. 幼兒完整 12 小時後進化",()=>expect(advanceTime(createPet(0),901*60000).pet.stage).toBe("teen"));
 it("4. 青少年完整 36 小時後成年",()=>expect(advanceTime(createPet(0),3061*60000).pet.stage).toBe("adult"));
 it("5. 離線 60 小時一次追趕多階段",()=>{const r=advanceTime(createPet(0),60*3600000);expect(r.pet.stage).toBe("adult");expect(r.summary.evolutions).toHaveLength(4)});
 it("6. 遊戲開啟期間年齡正常增加",()=>{const p=createPet(1000),r=advanceTime(p,61000);expect(r.pet.ageMinutes).toBeCloseTo(1)});
 it("11. 壽命按照顧表現調整",()=>{const p=createPet();expect(calculateLifeExpectancy({...p,lifetimeCareScore:95})).toBeGreaterThan(calculateLifeExpectancy({...p,lifetimeCareScore:20}))});
 it("12. 健康歸零先進入緊急狀態",()=>{const p={...createPet(0),health:0,lastUpdatedAt:0},n=advanceTime(p,60000).pet;expect(n.isAlive).toBe(true);expect(n.emergencySince).toBeDefined()});
 it("13. 緊急狀態有 12 小時挽救期",()=>{const p={...createPet(0),health:0,lastUpdatedAt:0,emergencySince:1};expect(advanceTime(p,719*60000).pet.isAlive).toBe(true);expect(advanceTime(p,722*60000).pet.isAlive).toBe(false)});
 it("14. 離去後建立紀念冊紀錄",()=>{const p={...createPet(),isAlive:false,departedAt:10,departureReason:"natural" as const};expect(memorialize(makeSave(p),10).game.history).toHaveLength(1)});
 it("15. 重生後 generation 增加",()=>{const s=makeSave({...createPet(),isAlive:false});expect(rebirth(s).game.generation).toBe(2)});
 it("16. 重生保留圖鑑、裝飾、成就、背包及 NPC 造型",()=>{const s={...makeSave({...createPet(),isAlive:false}),inventory:[{id:"x",itemId:"plant",quantity:1}],unlockedDecor:["wallpaper"],npcProgress:{aro:{stage:"adult" as const,unlockedLooks:["baby","child","teen","adult"],coPlayRewardsToday:0}}};const n=rebirth(s);expect(n.inventory).toEqual(s.inventory);expect(n.unlockedDecor).toEqual(["wallpaper"]);expect(n.achievements).toContain("starter");expect(n.npcProgress.aro?.unlockedLooks).toContain("adult")});
 it("17. 重生不保留婚姻",()=>{const s=makeSave({...createPet(),isAlive:false,spouseNpcId:"aro",marriedAt:3});expect(rebirth(s).pet.spouseNpcId).toBeUndefined()});
});

describe("萌寵親密與朋友",()=>{
 it("7. 餵食、清潔、遊戲及陪伴提升萌寵親密",()=>{let p=createPet(0);p=feedPet(p,food("rice"),1000);p=cleanPet(p,"bath",2000);p=applyGameResult(p,10,false,3000);p=petPet(p,4000).pet;expect(p.affection).toBeGreaterThan(30)});
 it("8. 重複撫摸不可無限增加",()=>{let p=createPet(0);p=petPet(p,1000).pet;const again=petPet(p,2000);expect(again.earned).toBe(false);expect(again.pet.affection).toBe(p.affection)});
 it("9. 長期忽略會降低親密",()=>{const p={...createPet(0),fullness:1,cleanliness:1,happiness:1,lastUpdatedAt:0};expect(advanceTime(p,24*3600000).pet.affection).toBeLessThan(p.affection)});
 it("10. 親密度影響進化分數",()=>{const p=createPet();expect(careScore({...p,affection:100})).toBeGreaterThan(careScore({...p,affection:0}))});
 it("18. 每日對話只增加一次朋友好感",()=>{const r={npcId:"aro",affection:0,gifts:[]};const a=talkToNpc(r,1000),b=talkToNpc(a.relationship,2000);expect(a.earned).toBe(true);expect(b.earned).toBe(false);expect(b.relationship.affection).toBe(2)});
 it("19. 遊戲代幣啟動朋友同玩模式",()=>{const s={...makeSave(),inventory:[{id:"token",itemId:"token",quantity:1}]};const started=startCoPlay(s,"aro");expect(started.ok).toBe(true);expect(started.save.inventory[0]!.quantity).toBe(0);expect(completeCoPlay(started.save,"aro").relationships[0]!.affection).toBe(6)});
});

describe("正式商品與共用繪製",()=>{
 it("20. 小盆栽可放置及每日澆水",()=>{const s={...makeSave(),inventory:[{id:"plant",itemId:"plant",quantity:1}]};const placed=placePlant(s);expect(placed.ok).toBe(true);const watered=waterPlant(placed.save,1000);expect(watered.ok).toBe(true);expect(waterPlant(watered.save,2000).ok).toBe(false)});
 it("21. 藥盒只有生病時可使用",()=>{const s={...makeSave(),inventory:[{id:"med",itemId:"medicine",quantity:1}]};expect(useMedicine(s).ok).toBe(false);expect(useMedicine({...s,pet:{...s.pet,isSick:true,sicknessType:"感冒"}}).ok).toBe(true)});
 it("22. 牆紙只可購買一次",()=>{const item=shopItems.find(i=>i.id==="wallpaper")!,s={...makeSave(),game:{...createGame(),coins:100}};const one=purchaseItem(s,item);expect(one.ok).toBe(true);expect(purchaseItem(one.save,item).ok).toBe(false)});
 it("23. 夜燈提高睡眠恢復",()=>{const p={...createPet(0),isSleeping:true,energy:10,lastUpdatedAt:0};expect(advanceTime(p,3600000,{nightlight:true}).pet.energy).toBeGreaterThan(advanceTime(p,3600000).pet.energy)});
 it("24. 圖鑑與主畫面共用同一角色繪製函式",()=>{const callsA:string[]=[],callsB:string[]=[];const ctx=(calls:string[])=>({save(){},restore(){},translate(){},scale(){},fillRect(x:number,y:number,w:number,h:number){calls.push(`${x},${y},${w},${h}`)},set fillStyle(_:string){},set globalAlpha(_:number){}}) as unknown as CanvasRenderingContext2D;drawSpeciesSprite(ctx(callsA),bySpecies("berrybun"),{x:0,y:0});drawSpeciesSprite(ctx(callsB),bySpecies("berrybun"),{x:0,y:0});expect(callsA).toEqual(callsB);expect(callsA.length).toBeGreaterThan(8)});
});

describe("Schema v2 migration 與 IndexedDB",()=>{
 const legacy=()=>({schemaVersion:1,exportedAt:1,pet:{...createPet(1),stageStartedAt:undefined,nextEvolutionAt:undefined,dailyPetInteraction:undefined,affectionHistory:undefined,lifeExpectancyMinutes:undefined,lifeStage:undefined,lifetimeCareScore:undefined},game:{...createGame(1),coins:321},inventory:[{id:"gift:plant",itemId:"plant",quantity:2}],relationships:[{npcId:"aro",affection:44,gifts:[]}],album:["stardust-egg","pomu"],achievements:["old"],settings:{theme:"lcd"}});
 it("25. Schema 1 無損升級到 Schema 2",()=>{const n=migrateSaveV1(legacy(),1000);expect(n.schemaVersion).toBe(2);expect(n.game.coins).toBe(321);expect(n.inventory[0]!.quantity).toBe(2);expect(n.relationships[0]!.affection).toBe(44);expect(n.album).toContain("pomu");expect(n.settings.theme).toBe("lcd");expect(n.pet.stageStartedAt).toBeDefined()});
 beforeEach(async()=>{await db.delete();await db.open()});
 it("26. Schema v2 存檔後讀取一致",async()=>{const s=makeSave();await persistSave(s);const r=await loadSave();expect(r?.schemaVersion).toBe(2);expect(r?.pet.stageStartedAt).toBe(s.pet.stageStartedAt)});
 it("27. 匯入 Schema 1 會自動升級並建立 v2",async()=>{const r=await importSave(legacy());expect(r.schemaVersion).toBe(2);expect((await loadSave())?.game.coins).toBe(321)});
});
