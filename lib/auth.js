const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookie = require("cookie");

const COOKIE_NAME = "senai_visitas_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurada nas variáveis de ambiente do projeto.");
  }
  return secret;
}

function signSession(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: `${SESSION_DAYS}d` });
}

function verifySession(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (e) {
    return null;
  }
}

function getSessionFromReq(req) {
  const raw = req.headers.cookie || "";
  const parsed = cookie.parse(raw);
  const token = parsed[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    })
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize(COOKIE_NAME, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
  );
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = {
  signSession,
  verifySession,
  getSessionFromReq,
  setSessionCookie,
  clearSessionCookie,
  hashPassword,
  comparePassword,
};
