import axios from "axios";
import * as cheerio from "cheerio";
import fs from "node:fs"

const visited = new Set();

async function crawler(url) {
   if (visited.has(url)) return;
  visited.add(url);

  console.log(url);

  const {data} = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  const $ = cheerio.load(data);
  const offers = [];
  /*$("a").each(function (i,el){
    //console.log(i);
    offers[i] = $(this).text();
  });*/

  $("a").each((i, el) => {
    const link = $(el).attr("href");
    const content = $(el).text();
    const rel = $(el).attr("rel");
    if ((content && content.includes("Philosophy")) || (rel && rel=="next")) {
      crawler(new URL(link, url).href);
    }
    //if (rel && rel=="next") { crawler(new URL(link, url).href);}
  });
}

fs.readFile('job_links.txt', 'utf8', (err, link) => {
  if (err) {
    console.error(err);
    return;
  }
  crawler(link);
});