import { registerUser, loginUser, getUserById } from "../services/authService.js";

const AUTHORITY_SECURITY_CODE = process.env.AUTHORITY_SECURITY_CODE || "AUTHORITY";

export const register = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      contact,
      ward_no,
      role,
      security_code,
      securityCode,
    } = req.body;

    const normalizedRole = (role || "citizen").toLowerCase();

    if (!["citizen", "authority"].includes(normalizedRole)) {
      return res.status(400).json({ error: "Invalid role. Use citizen or authority." });
    }

    if (normalizedRole === "authority") {
      const providedCode = security_code || securityCode;
      if (!providedCode || providedCode !== AUTHORITY_SECURITY_CODE) {
        return res.status(403).json({ error: "Invalid authority security code" });
      }
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await registerUser({
      email,
      password,
      name,
      contact,
      ward_no,
      role: normalizedRole,
    });

    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const data = await loginUser(email, password);
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

// GET /api/auth/me — returns user profile (role, ward_no, etc.)
export const getMe = async (req, res) => {
  try {
    const profile = await getUserById(req.user.id);

    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    res.json({ success: true, user: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};