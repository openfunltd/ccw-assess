$(document).ready(main("A4"));


async function main(tableId) {
  const GET_term = document.location.search.match(/term=([0-9]*)/);
  const GET_sessionPeriod = document.location.search.match(/sessionPeriod=([0-9]*)/);
  const pathname_comtCd = document.location.pathname.match(/\/(\d+)\.html$/);
  let term = (GET_term) ? GET_term[1] : 10;
  let sessionPeriod = (GET_sessionPeriod) ? GET_sessionPeriod[1] : 6;
  term = encodeURIComponent(term);
  sessionPeriod = encodeURIComponent(sessionPeriod);
  comtCd = encodeURIComponent(pathname_comtCd[1]);

  $(".term-session").text(`${term}-${sessionPeriod}`);
  $(document).prop('title', $("#title").text());

  let comtLegislators = [];
  let comtIndex = 0;
  const comtName = await getCommitteeName(comtCd);
  const legislators = await getLegislators(term);
  const trBeforeHead0 = $("#before-point");
  const tdHead1 = $("#head-row-1");
  const tdHead2 = $("#head-row-2");

  for (const legislator of legislators) {
    const isComt = legislator.committee.includes(`第${term}屆第${sessionPeriod}會期：${comtName}`);
    if (isComt) {
      comtIndex = comtIndex + 1;
      trBeforeHead0.before($(`<td class="dt-head-center">${comtIndex}</td>`));
      tdHead1.append(`<td class="dt-head-center">${legislator.party}</td>`);
      tdHead2.append(`<td class="dt-head-center nosort">${legislator.name}</td>`);
      comtLegislators.push(legislator.name);
    }
  }

  meetings = await getMeetings(term, sessionPeriod, comtCd);
  rowsData = []
  for(const meeting of meetings) {
    if (meeting.meet_type === "聯席會議" && !meeting.id.startsWith(`${term}-${sessionPeriod}-${comtCd}`, 5)) {
      continue;
    }
    let rowData = [];
    if (meeting.議事錄 === undefined){
      rowData.push(meeting.id, meeting.title);
      rowData.push(...Array(6 + comtLegislators.length * 6).fill(""));
      rowsData.push(rowData);
      continue;
    }
    const dates = formatDates(meeting.議事錄.時間);
    const meetingContent = meeting.meet_data.reduce((acc, content) => {
      if (dates.includes(content.date)) { acc[content.date] = content.meetingContent };
      return acc;
    }, {});
    console.log(meetingContent);
    console.log(meeting.id);
    let title = meeting.title;
    const attendees = meeting.議事錄.出席委員.join(" ");
    const interpellations = meeting.議事錄.質詢;
    let leaveList = meeting.議事錄.請假委員;
    leaveList = (leaveList === undefined) ? "" : leaveList.join(" ");
    for (const [i, date] of dates.entries()) {
      if (meetingContent[date] === undefined) { continue; }
      if (["審查"].some(word => !meetingContent[date].includes(word))) { continue; }
      if (dates.length > 1) { title = `${meeting.title}-${i+1}` };
      rowData = [comtName, date, title, meetingContent[date]];
      let [chairperson, oral, written] = [meeting.議事錄.主席, [], []];
      if (interpellations != undefined) {
        oral = interpellations.filter(item => item.日期 === date && item.種類 === "口頭質詢");
        if (oral.length > 0) { 
          oral = oral[0].委員;
          oral.pop(chairperson);
        }
        written = interpellations.filter(item => item.日期 === date && item.種類 === "書面質詢");
        if (written.length > 0) { 
          written = written[0].委員;
          written.pop(chairperson)
        }
      }
      //Still need to be clarify how to determine List of legislators had deliberate bills 
      const budgetDeliberation = [`${chairperson}（主席）`].concat(oral, written) ;
      rowData.push(budgetDeliberation.join("、"));
      for (const name of comtLegislators) {
        const hasDeliberate = (budgetDeliberation.includes(name)) ? 1 : 0;
        rowData.push(hasDeliberate);
      }
      rowData.push(1);
      rowsData.push(rowData);
    }
  }

  const table = $(`#${tableId}`).DataTable({
    keys: true,
    scrollX: true,
    fixedColumns: {left: 2},
    columnDefs: [
        { orderable: false, targets: 'nosort' }
    ],
    fixedHeader: true,
    dom: '<<"row"<"col"B><"col filter_adjust"f>>>rtip',
    buttons: [
        'pageLength', 'copy', 'excel'
    ],
    order: [1, 'asc'],
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
