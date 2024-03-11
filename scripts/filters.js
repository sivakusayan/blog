module.exports = {
    filterTagList: (tags) => (tags || []).filter((tag) => ["all", "nav", "post", "posts"].indexOf(tag) === -1),
    shortReadableDate: (dateObj) => {
        return dateObj.toLocaleDateString(undefined, {
          month: "short",
          day: "2-digit",
          year: "numeric",
        });
      },
    readableDate: (dateObj) => {
        return dateObj.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
}