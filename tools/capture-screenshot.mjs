import {chromium} from "playwright";
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
await page.goto("http://127.0.0.1:5173/?testMode=1",{waitUntil:"networkidle"});
await page.getByRole("button",{name:/開始孵蛋/}).click();
await page.waitForTimeout(500);
await page.screenshot({path:"public/screenshot.png",fullPage:true});
await browser.close();
