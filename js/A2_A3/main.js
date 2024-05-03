$(document).ready(main("A2_A3"));

async function main(tableId) {
  //get input from GET parameters
  const term = getTerm();
  const sessionPeriod = getSessionPeriod();

  //request and process data
  const comtCd = getComtCode();
  const comtName = await getCommitteeName(comtCd);
  const legislators = await getLegislators(term);
  const comtLegislators = getComtLegislators(legislators, term, sessionPeriod, comtName);
  const meetings = await getMeetings(term, sessionPeriod, comtCd);

  //render title, headers of table
  renderTitle(term, sessionPeriod);
  renderTableHeaders(comtLegislators);

  rows = []
  for(const meeting of meetings) {
    //check incomplete meet data
    if (!isTargetMeet(meeting, term, sessionPeriod, comtCd)){ continue; }
    if (meeting.議事錄 === undefined){
      rows.push(getBlankRow(meeting, comtLegislators));
      continue;
    }

    // extract meet data shared within days
    const dates = formatDates(meeting.議事錄.時間);
    const attendees = meeting.議事錄.出席委員.join(" ");
    const interpellations = meeting.議事錄.質詢;
    let leaveList = meeting.議事錄.請假委員;
    leaveList = (leaveList === undefined) ? "" : leaveList.join(" ");

    for (const [i, date] of dates.entries()) {
      row = [];
      title = getMeetTitle(meeting, dates.length);
      row.push(date, title, (i > 0) ? "（併簽）" : attendees);
      const [oral, written] = extractInterpellationData(interpellations, date);
      const oralMax = (oral.length > 0) ? 1 : 0;
      const assessData = getAssessData(comtLegislators, attendees, leaveList, oral, written, oralMax);
      row.push(oral, written, leaveList, meeting.議事錄.主席);
      row.push(...assessData);
      row.push(oralMax);
      rows.push(row);
    }
  }

  renderDataTable(tableId, rows);
}
