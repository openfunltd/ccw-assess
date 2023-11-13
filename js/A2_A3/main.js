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

  let comtLegislators = [];
  let comtIndex = 0;
  const comtName = await getCommitteeName(comtCd);
  const legislators = await getLegislators(term);
  const trBeforeHead0 = $("#before-point");
  const tdHead1 = $("#head-row-1");
  const tdHead2 = $("#head-row-2");
  const tdHead3 = $("#head-row-3");

  for (const legislator of legislators) {
    const isComt = legislator.committee.includes(`第${term}屆第${sessionPeriod}會期：${comtName}`);
    if (isComt) {
      comtIndex = comtIndex + 1;
      trBeforeHead0.before($(`<td class="dt-head-center" colspan="6">${comtIndex}</td>`));
      tdHead1.append(`<td class="dt-head-center" colspan="6">${legislator.party}</td>`);
      tdHead2.append(`<td class="dt-head-center" colspan="6">${legislator.name}</td>`);
      tdHead3.append(`<td class="nosort">出席</td>`);
      tdHead3.append(`<td class="nosort">請假</td>`);
      tdHead3.append(`<td class="nosort">缺席</td>`);
      tdHead3.append(`<td class="nosort">口頭質詢</td>`);
      tdHead3.append(`<td class="nosort">書面質詢</td>`);
      tdHead3.append(`<td class="nosort">書面採計</td>`);
      comtLegislators.push(legislator.name);
    }
  }

  meetings = await getMeetings(term, sessionPeriod, comtCd);
  rowsData = []
  for(const meeting of meetings) {
    let rowData = [];
    if (meeting.議事錄 === undefined){
      rowData.push(meeting.id, meeting.title);
      rowData.push(...Array(6 + comtLegislators.length * 6).fill(""));
      rowsData.push(rowData);
      continue;
    }
    let attendees = meeting.議事錄.出席委員.join(" ");
    let oral = meeting.議事錄.口頭質詢;
    oral = (oral === undefined) ? "" : oral.join(" ");
    let written = meeting.議事錄.書面質詢;
    written = (written === undefined) ? "" : written.join(" ");
    let leaveList = meeting.議事錄.請假委員;
    leaveList = (leaveList === undefined) ? "" : leaveList.join(" ");
    let oralMax = (oral === "") ? 0 : 1;
    rowData.push(formatDates(meeting.議事錄.時間), meeting.title, attendees);
    rowData.push(oral, written, leaveList);
    rowData.push(meeting.議事錄.主席);
    for (const name of comtLegislators) {
      const attended = (attendees.includes(name)) ? 1 : 0;
      const leave = (leaveList.includes(name)) ? 1 : 0;
      const absent = ([attended, leave] === [0, 0]) ? 1 : 0;
      const hasOral = (oral.includes(name)) ? 1 : 0;
      const hasWritten = (written.includes(name)) ? 1 : 0;
      let writtenCount = 0;
      if (oralMax > hasOral) {
        writtenCount = (hasOral + hasWritten > oralMax) ? oralMax - hasOral : hasWritten;
      }
      rowData.push(attended, leave, absent, hasOral, hasWritten, writtenCount);
    }
    rowData.push(oralMax);
    rowsData.push(rowData);
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
  const year = parseInt(dates.match(yearPattern)[0].slice(0, -1))  + 1911;
  const dateMatches = dates.match(datePattern);
  dates = dateMatches.map((match) => {
    const [month, day] = match.match(/(\d+)/g);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  });
  return dates;
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
