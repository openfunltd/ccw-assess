$(document).ready(main("A1"));


async function main(tableId) {
  const table = $('#' + tableId).DataTable({
    keys: true,
  });
  const legislators = await getLegislators(10, 6);
  table.rows.add(legislators).draw(false);
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

async function getLegislators(term, sessionPeriod) {
  return new Promise((resolve, reject) => {
    const url = "https://ly.govapi.tw/legislator/" + encodeURIComponent(term) + "?limit=300";
    $.getJSON(url, async function(data) {
      type1Committees = await getType1Committees();
      let legislators = [];
      let name, part, comt;
      data.legislators.forEach(legislator => {
        name = legislator.name;
        party = legislator.party;
        committee = legislator.committee.filter(comt => comt.includes(`第${term}屆第${sessionPeriod}會期`));
        committee = committee.map(comt => comt.split("：")[1]);
        comt = committee.filter(comt => type1Committees.includes(comt))[0];
        if (comt === undefined) { comt = ""; };
        legislators.push([comt, party, name]);
        resolve(legislators);
      });
    });
  });
}
