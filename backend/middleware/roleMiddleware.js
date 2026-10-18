export const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.userRole

    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: "Access denied" })
    }

    next()
  }
}