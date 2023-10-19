$(document).ready(main("A1"));


async function main(tableId) {
  const table = $('#' + tableId).DataTable({
    keys: true,
    scrollX: true,
    fixedColumns: {left: 6},
    columnDefs: [
      { orderable: false, targets: 'nosort' }
    ],
    fixedHeader: true,
  });
  const term = 10;
  const sessionPeriod = 6;
  const legislators = await getLegislators(10, 6);
  const type1Committees = await getType1Committees();
  const attendance = await getAttendance(10, 6);
  let rowsData = [];
  let committee, sessionTimes, attended, leave;
  legislators.forEach(legislator => {
    let rowData = {};
    rowData.name = legislator.name;
    rowData.party = legislator.party;
    committee = legislator.committee.filter(comt => comt.includes(`第${term}屆第${sessionPeriod}會期`)); 
    committee = committee.map(comt => comt.split("：")[1]);
    committee = committee.filter(comt => type1Committees.includes(comt))[0];
    if (committee === undefined) { committee = ""; };
    rowData.committee = committee;
    let total_count = 0;
    let attended_count = 0;
    let ccw_score = 0;
    attendance.forEach(meet => {
      sessionTimes = meet.sessionTimes.toString();
      if (["15","16"].includes(sessionTimes)){
        return;
      }
      attended = meet.議事錄.出席委員;
      leave = meet.議事錄.請假委員;
      total_count += 1;
      if (attended.includes(rowData.name)){
        rowData[sessionTimes] = "attended";
        attended_count += 1;
      } else if (leave.includes(rowData.name)){
        rowData[sessionTimes] = "leave";
      } else {
        rowData[sessionTimes] = "absent";
      }
    });
    ccw_score = (attended_count/total_count) * 3
    rowData.total_count = total_count;
    rowData.attended_count = attended_count;
    rowData.ccw_score = ccw_score;
    rowsData.push(rowData);
  });
  rowsData = rowsData.map(function(rowData){
    let row = [rowData.committee, rowData.party, rowData.name];
    row = row.concat([rowData.total_count, rowData.attended_count, rowData.ccw_score]);
    let meet_count = Object.keys(rowData).length - row.length;
    for(var i = 1; i <= meet_count; i++) {
      console.log("i", i)
      if (rowData[i.toString()] === "attended"){
        row = row.concat([1,0,0]);
      } else if (rowData[i.toString()] === "leave"){
        row = row.concat([0,1,0]);
      } else {
        row = row.concat([0,0,1]);
      }
    }
    return row;
  });
  table.rows.add(rowsData).draw(false);
  table.columns.adjust().draw();
}

function getAttendance(term, sessionPeriod) {
  return new Promise((resolve, reject) => {
    const url = "https://ly.govapi.tw/meet/" +
        "?term=" + encodeURIComponent(term) +
        "&sessionPeriod=" + encodeURIComponent(sessionPeriod) +
        "&meet_type=院會";
    $.getJSON(url, function(data) {
      resolve(data.meets);
    });
  });
}

function getType1Committees() {
  return new Promise((resolve, reject) => {
    $.getJSON("https://ly.govapi.tw/committee", function(data) {
      let type1Committees = data.committees.filter(comt => comt.comtType === 1);
      type1Committees = type1Committees.map(comt => comt.comtName);
      resolve(type1Committees);
    });
  });
}

function getLegislators(term, sessionPeriod) {
  return new Promise((resolve, reject) => {
    const url = "https://ly.govapi.tw/legislator/" + encodeURIComponent(term) + "?limit=300";
    $.getJSON(url, function(data) {
      resolve(data.legislators);
    });
  });
}
