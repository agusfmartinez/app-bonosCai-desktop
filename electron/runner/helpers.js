function logStamp(date = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function normalizeCookies(cookies) {
  return cookies.map((cookie) => {
    if (cookie.expirationDate) {
      cookie.expires = cookie.expirationDate;
      delete cookie.expirationDate;
    }
    delete cookie.storeId;
    delete cookie.hostOnly;
    delete cookie.session;
    if (cookie.sameSite) {
      cookie.sameSite =
        cookie.sameSite.charAt(0).toUpperCase() +
        cookie.sameSite.slice(1).toLowerCase();
    }
    return cookie;
  });
}

module.exports = {
  logStamp,
  normalizeCookies,
};
