const getChanges = async function () {
  const url =
    "https://chromium-review.googlesource.com/changes/?q=owner:1523927";
  let res = await fetch(url);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    // The chromium gerrit API seems to currently return rogue characters in the first
    // line of the response. So we need to parse this ourselves.
    // Unfortunately, since the body was consumed we need to get this data again.
    res = await fetch(url);
    let badData = await res.text();
    // We just need to delete the first line to get good JSON data.
    badData = badData.substring(badData.indexOf("\n") + 1);
    data = JSON.parse(badData);
  }
  return data;
};

module.exports = async function () {
  const data = await getChanges();
  return {
    inProgress: data.filter((change) => change.status === "NEW"),
    merged: data.filter((change) => change.status === "MERGED"),
  };
};
