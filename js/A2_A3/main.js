$(document).ready(main("A2_A3"));


async function main(tableId) {
  const GET_term = document.location.search.match(/term=([0-9]*)/);
  const GET_sessionPeriod = document.location.search.match(/sessionPeriod=([0-9]*)/);
  const pathname_comtCd = document.location.pathname.match(/\/(\d+)\.html$/);
  let term = (GET_term) ? GET_term[1] : 10;
  let sessionPeriod = (GET_sessionPeriod) ? GET_sessionPeriod[1] : 6;
  term = encodeURIComponent(term);
  sessionPeriod = encodeURIComponent(sessionPeriod);
  comtCd = encodeURIComponent(pathname_comtCd[1]);

  $(document).prop('title', `A2 A3 ${term}-${sessionPeriod} 外交及委員會出席及質詢`);
  $("#title").text(`A2 A3 ${term}-${sessionPeriod} 外交及國防委員會出席及質詢`);

  meetings = await getMeetings(term, sessionPeriod, comtCd);
  rowsData = []
  for(const meeting of meetings) {
    if (meeting.議事錄 === undefined){
      rowsData.push([meeting.id, meeting.title, "", "", "", "", "", ""]);
      continue;
    }
    let rowData = [];
    rowData.push(formatDates(meeting.議事錄.時間));
    rowData.push(meeting.title);
    rowData.push(meeting.議事錄.出席委員.join(" "));
    let oral = meeting.議事錄.口頭質詢;
    oral = (oral === undefined) ? "" : oral.join(" ");
    rowData.push(oral);
    let written = meeting.議事錄.書面質詢;
    written = (written === undefined) ? "" : written.join(" ");
    rowData.push(written);
    let leave = meeting.議事錄.請假委員;
    leave = (leave === undefined) ? "" : leave.join(" ");
    rowData.push(leave);
    rowData.push(meeting.議事錄.主席);
    let number_of_oral_queries = (oral === "") ? 0 : 1;
    rowData.push(number_of_oral_queries);
    rowsData.push(rowData);
  }

  let comtLegislators = [];
  const comtName = await getCommitteeName(comtCd);
  const legislators = await getLegislators(term);

  for (const legislator of legislators) {
    const isComt = legislator.committee.includes(`第${term}屆第${sessionPeriod}會期：${comtName}`);
    if (isComt) { comtLegislators.push(legislator.name); }
  }

  const table = $('#' + tableId).DataTable({
    keys: true,
    scrollX: true,
    columnDefs: [
        { orderable: false, targets: 'nosort' }
    ],
    fixedHeader: true,
    dom: '<<"row"<"col"B><"col filter_adjust"f>>>rtip',
    buttons: [
        'pageLength', 'copy', 'excel'
    ]
  });

  table.rows.add(rowsData).draw(false);
}

function getMeetings(term, sessionPeriod, comtCd) {
  return new Promise((resolve, reject) => {
    const url = "https://ly.govapi.tw/meet/" +
        "?term=" + term +
        "&sessionPeriod=" + sessionPeriod +
        "&committee_id=" + comtCd;
    $.getJSON(url, function(data) {
      resolve(data.meets);
    });
  });
}

function formatDates(dates) {
  const yearPattern = /(\d+年)/g;
  const datePattern = /(\d+月\d+日)/g;
  const year = dates.match(yearPattern)[0];
  let dateMatches = dates.match(datePattern);
  dateMatches = dateMatches.map((match) => {
    const [month, day] = match.match(/(\d+)/g);
    return `${month.padStart(2, '0')}月${day.padStart(2, '0')}日`;
  });
  dates = dateMatches.join('／');
  return year + dates;
}

function getLegislators(term) {
  return new Promise((resolve, reject) => {
    const url = `https://ly.govapi.tw/legislator/${term}?limit=300`;
    $.getJSON(url, function(data) {
      resolve(data.legislators);
    });
  });
}

function getCommitteeName(comtCd) {
  return new Promise((resolve, reject) => {
    const url = `https://ly.govapi.tw/committee/${comtCd}`;
    $.getJSON(url, function(data) {
      resolve(data.comtName);
    });
  });
}
