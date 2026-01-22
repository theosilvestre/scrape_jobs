import axios from "axios";             // retrieve static web html
import { chromium } from 'playwright'; // open web page inside a browser to manage js produced html
import * as cheerio from "cheerio";    // query in html
import fs from "node:fs"               // read/write files


// first strategy: static web html
async function staticHtml(url){
  const {data} = await axios.get(url, {   
  headers: {"User-Agent": "Mozilla/5.0"}
  });
  return data;
}
// second strategy: js rendered web page
async function jsRenderedHtml(url){
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/109.0',
  });
  const page = await context.newPage();
  await page.goto(link, { waitUntil: 'domcontentloaded' });
  const html = await page.content();
  await browser.close();
  return html;
}

const visited = new Set();
async function crawler(url,depth) {
  if (visited.has(url)) return;
  visited.add(url);

  console.log(depth+'  '+url);

  const {data} = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });
  
  var $ = cheerio.load(data);
  /*const data = staticHtml(url);
  var $ = cheerio.load(data);*/           // $ refers to a class and needs to be instantiated as an object to be used, for example $('*') which selects all the html.

  if(depth==2){
    let deadline;
    let compt = 0;
    while(deadline==undefined || deadline=='' || compt < 2){  //first test static axios then js rendered with playwright then exit with blank or undefined value
      compt += 1;
      deadline = $('*').filter((i, el) => {
        const adText = $(el).text().toLowerCase();
        if(adText.length<=30 && (adText.includes("application deadline") || adText.includes("closing date") || adText.includes("posting end date") || adText.includes("close"))){
          return $(el).children().length === 0; // leaf nodes only
        }
        else return;
      }).next().text().trim();
      //if(deadline==undefined) $ = cheerio.load(jsRenderedHtml(url));      
      if(deadline==undefined || deadline==''){
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/109.0',
        });
        const page = await context.newPage();
        await page.goto(url);
        await Promise.all([
          page.waitForLoadState('domcontentloaded'), // Wait for DOM to be ready
          page.waitForLoadState('networkidle')      // Then wait for all network activity to stop
        ]);
        const html = await page.content();
        fs.appendFile('play.html', html, function (err) {
          if (err) return console.log(err);
        });
        $ = cheerio.load(html);  
        await browser.close();    
      }
    }
    fs.appendFile('job_base.csv', deadline+';'+url+'\n', function (err) {
      if (err) return console.log(err);
    });
  }
  else if(depth==1){
    $('.description').each((i, el) => {
      const content = $(el).text();
      const joblink = $('a:contains("View or Apply")').attr('href');
      if (content && (content.includes("bayesian") || content.includes("Bayesian"))){
        crawler(joblink,2);
      }
    });
  }
  else if(depth==0){
    $('a').each((i, el) => {
      const link = $(el).attr("href");
      const dataevcat = $(el).attr("data-ev-cat");
      if (dataevcat && dataevcat=="Search") crawler(new URL(link, url).href,1);
      else{
        const rel = $(el).attr("rel");
        if (rel && rel=="next") crawler(new URL(link, url).href,0);
      }
    });
  }
}

fs.readFile('job_links.txt', 'utf8', (err, link) => {
  if (err) {
    console.error(err);
    return;
  }
  crawler(link,0);
});
