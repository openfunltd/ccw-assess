$(document).ready(main());


async function main() {
  const stat = await getStat();  
}

function getStat() {
  return new Promise((resolve, reject) => {
    const url = "https://ly.govapi.tw/stat";
    $.getJSON(url, function(data) { resolve(data) });
  });
}
