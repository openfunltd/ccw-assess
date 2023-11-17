$(document).ready(main("A4"));

async function main(tableId) {
  const GET_term = document.location.search.match(/term=([0-9]*)/);
  const GET_sessionPeriod = document.location.search.match(/sessionPeriod=([0-9]*)/);
  let term = (GET_term) ? GET_term[1] : 10;
  let sessionPeriod = (GET_sessionPeriod) ? GET_sessionPeriod[1] : 6;
  term = encodeURIComponent(term);
  sessionPeriod = encodeURIComponent(sessionPeriod);

  $(".term-session").text(`${term}-${sessionPeriod}`);
  $(document).prop('title', $("#title").text());

  const standingComtsCode = [15, 35, 19, 20, 22, 23, 36, 26];
  let committeesLegislators = Array.from({ length: 8 }, () => []);
  const legislators = await getLegislators(term);
  const type1Committees = await getType1Committees();

  for (const legislator of legislators) {
    for (const [i, comtCd] of standingComtsCode.entries()) {
      const comtName = type1Committees[comtCd];
      const isComt = legislator.committee.includes(`第${term}屆第${sessionPeriod}會期：${comtName}`);
      if (isComt) { committeesLegislators[i].push(legislator); }
    }
  }

  const meetings = await getMeetings(term, sessionPeriod);
  let committeesMeetings = Array.from({ length: 8 }, () => []);

  for (const meeting of meetings) {
    if (meeting.meet_type === "院會") { continue; }
    for (const [comtIdx, comtCd] of standingComtsCode.entries()) {
      if (meeting.發言紀錄 === undefined) { continue; }
      if (meeting.committees === null || !meeting.committees.includes(comtCd)) { continue; }
      if (meeting.meet_type === "聯席會議" && !meeting.id.startsWith(`${term}-${sessionPeriod}-${comtCd}`, 5)) {
        continue;
      }
      const dates = meeting.發言紀錄.map(record => record.smeetingDate);
      for (const [dateIdx, date] of dates.entries()) {
        const commentRecord = meeting.發言紀錄[dateIdx];
        const meetingContent = commentRecord.meetingContent;
        if (!meetingContent.includes("審查")) { continue; }
        committeesMeetings[comtIdx].push(commentRecord);
      }
    }
  }

  let rowsData = [];
  for (const [i, comtLegislators] of committeesLegislators.entries()) {
    const comtName = type1Committees[standingComtsCode[i]];
    for (const legislator of comtLegislators){
      let rowData = [];
      const canDeliberateCnt = committeesMeetings[i].length;
      const hasDeliberateCnt = committeesMeetings[i].filter(function(record){
        return record.legislatorNameList.includes(legislator.name);
      }).length;
      const deliberateScore = ((hasDeliberateCnt / canDeliberateCnt) * 20).toFixed(2);
      rowData.push(comtName, legislator.party, legislator.name);
      rowData.push(canDeliberateCnt, hasDeliberateCnt, deliberateScore);
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

function getMeetings(term, sessionPeriod) {
  return new Promise((resolve, reject) => {
    const url = "https://ly.govapi.tw/meet" +
        "?term=" + term +
        "&sessionPeriod=" + sessionPeriod +
        "&limit=1000";
    $.getJSON(url, function(data) {
      resolve(data.meets);
    });
  });
}

function getLegislators(term) {
  return new Promise((resolve, reject) => {
    const url = `https://ly.govapi.tw/legislator/${term}?limit=300`;
    $.getJSON(url, function(data) {
      resolve(data.legislators);
    });
  });
}

function getType1Committees() {
  return new Promise((resolve, reject) => {
    $.getJSON("https://ly.govapi.tw/committee", function(data) {
      let type1Committees = data.committees.filter(comt => comt.comtType === 1);
      type1Committees = type1Committees.reduce((acc, comt) => {
        acc[comt.comtCd] = comt.comtName;
        return acc;
      }, {});
      resolve(type1Committees);
    });
  });
}
