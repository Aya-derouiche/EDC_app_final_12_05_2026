const jwt = require("jsonwebtoken");

function issueAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      role: user.role,
      tenantId: user.entreprise_id,
      entrepriseId: user.entreprise_id,
      code_entreprise: user.code_entreprise,
      gym_branch_id: user.gym_branch_id,
      branch_id: user.gym_branch_id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "2h" }
  );
}

function issueRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: "refresh" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES_IN || "7d" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { issueAccessToken, issueRefreshToken, verifyToken };
