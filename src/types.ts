export type Stage="egg"|"baby"|"child"|"teen"|"adult";
export type Personality="活潑"|"溫柔"|"害羞"|"優雅"|"平靜"|"幽默";
export type BehaviorTag="active"|"sweetTooth"|"healthy"|"clean"|"affectionate"|"calm"|"neglected";
export interface Tags extends Record<BehaviorTag,number>{}
export interface Pet {id:string;name:string;speciesId:string;stage:Stage;personality:Personality;birthAt:number;lastUpdatedAt:number;ageMinutes:number;health:number;fullness:number;happiness:number;cleanliness:number;energy:number;affection:number;weight:number;idealWeightMin:number;idealWeightMax:number;poopCount:number;isSick:boolean;sicknessType?:string;isSleeping:boolean;isAlive:boolean;careMistakes:number;mealsToday:number;snacksToday:number;gamesPlayedToday:number;giftsReceived:number;behaviorTags:Tags;spouseNpcId?:string;marriedAt?:number;emergencySince?:number;}
export interface Species {id:string;name:string;en:string;stage:Stage;color:string;accent:string;shape:number;description:string;favoriteFood:string;favoriteGift:string;personality:Personality;weight:[number,number];from:string[];hint:string;}
export interface Food {id:string;name:string;kind:"meal"|"snack";price:number;fullness:number;happiness:number;weight:number;health:number;icon:string;}
export interface Gift {id:string;name:string;price:number;rarity:"common"|"uncommon"|"rare"|"special";description:string;preferredBy:string[];affectionValue:number;icon:string;}
export interface Npc {id:string;name:string;en:string;personality:Personality;likes:string[];dislikes:string[];color:string;dialogue:string[];}
export interface GameState {id:"main";coins:number;lastSavedAt:number;highScores:Record<string,number>;weightHistory:{at:number;value:number}[];generation:number;clockAnomalies:number;history:Memorial[];}
export interface Memorial {name:string;speciesId:string;bornAt:number;passedAt:number;spouseNpcId?:string;careGrade:string;}
export interface Relationship {npcId:string;affection:number;lastTalkAt?:number;gifts:string[];}
export interface InventoryItem {id:string;itemId:string;quantity:number;}
export interface OfflineSummary {minutes:number;fullness:number;happiness:number;cleanliness:number;weight:number;poops:number;clockAnomaly:boolean;}
export interface SaveFile {schemaVersion:1;exportedAt:number;pet:Pet;game:GameState;inventory:InventoryItem[];relationships:Relationship[];album:string[];achievements:string[];settings:Record<string,unknown>;}
