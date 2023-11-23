$(document).ready(main("A5"));

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
  const type1Committees = await getType1Committees();
  const legislators = await getLegislators(term);

  for (const legislator of legislators) {
    for (const [i, comtCd] of standingComtsCode.entries()) {
      const comtName = type1Committees[comtCd];
      const isComt = legislator.committee.includes(`第${term}屆第${sessionPeriod}會期：${comtName}`);
      if (isComt) { committeesLegislators[i].push(legislator); }
    }
  }

  let partyGroups = legislators.reduce(function (acc, curr) {
    const partyGroup = curr.partyGroup;
    if (partyGroup != "0無" && !acc.includes(partyGroup)) { acc.push(partyGroup) };
    return acc;
  }, []);
  partyGroups = partyGroups.map((partyGroup) => `${partyGroup}立法院黨團`);

  const tdHead0 = $("#head-row-0");
  const tdHead1 = $("#head-row-1");
  const tdHead2 = $("#head-row-2");

  for (const [comtIdx ,comtLegislators] of committeesLegislators.entries()) {
    const comtName = type1Committees[standingComtsCode[comtIdx]];
    for (const legislator of comtLegislators) {
      tdHead0.append(`<td class="dt-head-center">${comtName}</td>`);
      tdHead1.append(`<td class="dt-head-center">${legislator.party}</td>`);
      tdHead2.append(`<td class="dt-head-center nosort">${legislator.name}</td>`);
    }
  }

  for (partyGroup of partyGroups) {
    tdHead0.append(`<td class="dt-head-center nosort" rowspan="3">${partyGroup}</td>`);
  }

  let rowsData = [];
  let orderedLegislators = committeesLegislators.reduce((acc, curr) => acc.concat(curr), []);
  orderedLegislators = orderedLegislators.map((legislator) => legislator.name);
  const orderedLegislatorsGroups = orderedLegislators.concat(partyGroups);
  const bills = await getLegislatorLawBills(term, sessionPeriod);
  for (bill of bills) {
    if (bill.議案名稱.includes("擬撤回前提之")) { continue };
    let rowData = [];
    let billName = bill.議案名稱;
    const startIdx = billName.indexOf("「");
    const endIdx = billName.indexOf("」");
    billName = billName.substring(startIdx + 1, endIdx);
    let theFirst = "No Data";
    if (bill.提案人 != undefined) { theFirst = bill.提案人[0] };
    if (theFirst === "No Data") { console.log(bill.billNo) }
    let data = Array.from({ length: orderedLegislatorsGroups.length }).fill(0);
    theFirstIdx = orderedLegislatorsGroups.indexOf(theFirst);
    if (theFirstIdx > -1) { data[theFirstIdx] = 1 };
    rowData.push(billName, bill.提案編號, theFirst, ...data);
    rowsData.push(rowData);
  }

  const table = $(`#${tableId}`).DataTable({
    keys: true,
    scrollX: true,
    fixedColumns: {left: 3},
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

function getLegislatorLawBills(term, sessionPeriod) {
  return new Promise((resolve, reject) => {
    const url = `https://ly.govapi.tw/bill/?term=${term}&sessionPeriod=${sessionPeriod}` +
      "&bill_type=法律案&proposal_type=委員提案&limit=2000";
    $.getJSON(url, function(data) {
      resolve(data.bills);
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

