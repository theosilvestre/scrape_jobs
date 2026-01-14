import axios from "axios";
import * as cheerio from "cheerio";
import fs from "node:fs"

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

  const $ = cheerio.load(data);
  
  if(depth==2){
    /*const deadline = $('*:contains("Deadline")').filter((i, el) => {
      return $(el).children().length === 0; // leaf nodes only
    }).next().text().trim();
    fs.appendFile('job_base.csv', deadline+';'+url+'\n', function (err) {
      if (err) return console.log(err);
    });*/
    const deadline = $('*').filter((i, el) => {
      const adText = $(el).text().toLowerCase();
      if(adText.length<=30 && (adText.includes("application deadline") || adText.includes("closing date") || adText.includes("posting end date") || adText.includes("close"))){
        // console.log(adText);
        // console.log(adText.length);
        return $(el).children().length === 0; // leaf nodes only
      }
      else return;
    }).next().text().trim();
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
