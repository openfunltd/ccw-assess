$(document).ready(main());


async function main() {
  const [latestTerm, latestSessionPeriod] = getLatestTermSessionPeriod();
  termSelectTag = $("#term");
  for (let term = 8; term <= latestTerm; term++) {
    isLatest = (term === latestTerm) ? true : false;
    termSelectTag.append(new Option(term, term, false, isLatest));
  }
  termSelectTag.attr("onchange",
    `displaySessionPeriod(false, ${latestTerm}, ${latestSessionPeriod}, this.value);`)
  displaySessionPeriod(true, latestTerm, latestSessionPeriod, termSelectTag.val());

  const stat = await getStat();
}

function getStat() {
  return new Promise((resolve, reject) => {
    const url = "https://ly.govapi.tw/stat";
    $.getJSON(url, function(data) { resolve(data) });
  });
}

function getLatestTermSessionPeriod() {
  const now = new Date();
  nowYear = now.getFullYear();
  const term = Math.floor((nowYear - 2012) / 4) + 8;
  checkDate = new Date(nowYear, 6, 1);
  let sessionPeriod = (nowYear % 4) * 2;
  if (checkDate < now) { sessionPeriod++ };
  return [term, sessionPeriod];
}

function displaySessionPeriod(isInitial, latestTerm, latestSessionPeriod, selectedTerm){
  selectedTerm = parseInt(selectedTerm);
  const sessionPeriodSelectTag = $('#sessionPeriod');
  let maxSessionPeriod = 8;
  if (latestTerm === selectedTerm) { maxSessionPeriod = latestSessionPeriod };
  sessionPeriodSelectTag.find('option').each(function(idx){
    const option = $(this);
    if (option.is(':hidden') && idx <= maxSessionPeriod) { option.show() };
    if (idx > maxSessionPeriod) { option.hide() };
  });
  if (isInitial === true) {
    sessionPeriodSelectTag.val(latestSessionPeriod);
  } else {
    sessionPeriodSelectTag.val("");
  }
}
