const User = require('../models/UsersModel');
const PasswordResetToken = require('../models/PasswordResetTokenModel');
const bcrypt = require('bcrypt');
const { sendPasswordResetEmail } = require('../services/mailService');
const { generateSecureToken, hashValue } = require('../utils/encryption');
const { normalizeProfileImageUrl, isAllowedProfileImageUrl } = require('../utils/mediaUrl');
const { getClientBaseUrl } = require('../config/clientOrigin');

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRES_MS =
    (Number(process.env.PASSWORD_RESET_EXPIRES_HOURS) || 1) * 60 * 60 * 1000;

function clientBaseUrl() {
    return getClientBaseUrl();
}

/** ניקוי שדות מהטופס לפני שמירה — מונע כשלי ולידציה על טלפון/רווחים */
function normalizeNewUserPayload(body) {
    const raw = body && typeof body === 'object' ? body : {};
    const out = { ...raw };

    if (typeof out.firstName === 'string') out.firstName = out.firstName.trim();
    if (typeof out.lastName === 'string') out.lastName = out.lastName.trim();
    if (typeof out.email === 'string') out.email = out.email.trim().toLowerCase();

    if (typeof out.phone === 'string') {
        const digits = out.phone.replace(/\D/g, '');
        if (digits.length >= 9 && digits.length <= 10) {
            out.phone = digits;
        } else {
            /* טלפון לא חובה — אם הוזן חלקית/לא תקין לא נשלח לשדה כדי שלא ייכשל ולידציה */
            delete out.phone;
        }
    }

    if (out.phone === '' || out.phone == null) delete out.phone;

    if (typeof out.profileImage === 'string') {
        const u = normalizeProfileImageUrl(out.profileImage);
        if (u && isAllowedProfileImageUrl(u)) {
            out.profileImage = u;
        } else if (u) {
            delete out.profileImage;
        } else {
            delete out.profileImage;
        }
    } else {
        delete out.profileImage;
    }

    const allowedStatus = ['manager', 'lecturer', 'student'];
    if (!allowedStatus.includes(out.status)) {
        out.status = 'student';
    }

    return out;
}

function validationMessageHe(err) {
    if (!err?.errors || typeof err.errors !== 'object') return 'נתונים לא תקינים';
    const parts = [];
    for (const [key, e] of Object.entries(err.errors)) {
        const msg = e?.message || '';
        if (key === 'phone' || msg.includes('phone')) {
            parts.push('מספר טלפון: הזיני 9–10 ספרות בלבד, או השאירי ריק');
        } else if (key === 'email' || msg.includes('email')) {
            parts.push('כתובת המייל אינה תקינה או כבר קיימת במערכת');
        } else if (key === 'password') {
            parts.push('סיסמה: לפחות 6 תווים');
        } else if (key === 'firstName' || key === 'lastName') {
            parts.push('שם פרטי / משפחה: לפחות 2 תווים');
        } else {
            parts.push(msg || key);
        }
    }
    return parts.length ? parts.join(' · ') : 'נתונים לא תקינים';
}

// -------------------------------------
// getAllUsers – שליפת כל המשתמשים
// -------------------------------------
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).send(users);
    }
    catch (err) {
        res.status(500).send(err);
    }
};

// -------------------------------------
// getUserById – שליפת משתמש לפי ID
// -------------------------------------
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user)
            return res.status(404).send({ message: "User not found" });

        res.status(200).send(user);
    }
    catch (err) {
        res.status(500).send(err);
    }
};

// -------------------------------------
// addNewUser – הוספת משתמש חדש
// -------------------------------------
const addNewUser = async (req, res) => {
    try {
        const payload = normalizeNewUserPayload(req.body);

        /* הרשמה ציבורית — לא ניתן לבחור מנהל; מנהלים נוצרים רק בשרת */
        if (payload.status === 'manager') {
            payload.status = 'student';
        }

        if (payload.status === 'lecturer') {
            payload.accountStatus = 'pending';
        } else {
            payload.accountStatus = 'approved';
        }

        // userCode generation: if not provided, auto-increment based on existing max.
        if (payload.userCode === undefined || payload.userCode === null || payload.userCode === "") {
            const lastUser = await User.findOne({}, { userCode: 1 }).sort({ userCode: -1 }).lean();
            const nextCode = (lastUser?.userCode ?? 0) + 1;
            payload.userCode = nextCode;
        }

        const newUser = new User(payload);
        await newUser.save();

        const populatedUser = await User.findById(newUser._id).lean();

        res.status(200).send(populatedUser);
    }
    catch (err) {
        console.log('❌ addNewUser failed', err);

        // Duplicate key (e.g., email/userCode unique)
        if (err?.code === 11000) {
            const dupKey = err?.keyPattern ? Object.keys(err.keyPattern).join(',') : '';
            const msg = dupKey.includes('email')
                ? 'כתובת המייל כבר רשומה במערכת — נסי להתחבר או להשתמש במייל אחר'
                : 'ערך כפול במערכת (למשל קוד משתמש) — נסי שוב';
            return res.status(409).send({
                message: msg,
                key: err?.keyPattern,
            });
        }

        // Mongoose validation
        if (err?.name === 'ValidationError') {
            return res.status(400).send({
                message: validationMessageHe(err),
                errors: err?.errors,
            });
        }

        return res.status(500).send({ message: 'Internal Server Error' });
    }
};

// -------------------------------------
// deleteUser – מחיקת משתמש
// -------------------------------------
const deleteUser = async (req, res) => {
    try {
        const deleted = await User.findByIdAndDelete(req.params.id);

        if (!deleted)
            return res.status(404).send({ message: "User not found" });

        res.status(200).send({ message: "user deleted", deletedUser: deleted });
    }
    catch (err) {
        res.status(500).send(err);
    }
};

// -------------------------------------
// updateUser – עדכון משתמש
// -------------------------------------
const updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { ...req.body } },
            { new: true }
        );

        if (!updatedUser)
            return res.status(404).send({ message: "User not found" });

        res.status(200).send({ message: "user updated", updatedUser });
    }
    catch (err) {
        res.status(500).send(err);
    }
};

// -------------------------------------
// loginUser – התחברות לפי מייל + סיסמה (בסיסי)
// -------------------------------------
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body ?? {};

        if (!email || !password) {
            return res.status(400).send({
                message: "נא למלא מייל וסיסמה",
                code: "MISSING_FIELDS",
            });
        }

        const emailNorm = String(email).trim().toLowerCase();
        const user = await User.findOne({
            $expr: { $eq: [{ $toLower: "$email" }, emailNorm] },
        })
            .select("+password")
            .lean();
        if (!user) {
            return res.status(401).send({
                message:
                    "אין משתמש רשום עם המייל הזה. אם עדיין לא נרשמת — לחצי על «הרשמה» והקימי חשבון.",
                code: "USER_NOT_FOUND",
            });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).send({
                message: "הסיסמה שגויה. נסי שוב, או ודאי שהקלדת את כתובת המייל הנכונה.",
                code: "BAD_PASSWORD",
            });
        }

        if (user.status === "lecturer" && user.accountStatus === "rejected") {
            return res.status(403).send({
                message:
                    "הבקשה שלך להצטרף לאתר לא אושרה. לפרטים נוספים פני למנהלת האתר.",
                code: "ACCOUNT_REJECTED",
            });
        }

        const { password: _pw, ...safeUser } = user;
        return res.status(200).send(safeUser);
    }
    catch (err) {
        return res.status(500).send(err);
    }
};

/** העלאת תמונת פרופיל מקובץ (אמין יותר מקישור חיצוני) */
const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "לא הועלה קובץ תמונה" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send({ message: "משתמש לא נמצא" });
        }

        const relPath = `/uploads/profiles/${req.file.filename}`;
        user.profileImage = relPath;
        await user.save();

        const updated = await User.findById(user._id).lean();
        const { password: _pw, ...safeUser } = updated;
        return res.status(200).send(safeUser);
    } catch (err) {
        console.error("[uploadProfileImage]", err?.message ?? err);
        return res.status(500).send({ message: "שגיאה בהעלאת תמונת הפרופיל" });
    }
};

/** בקשת איפוס סיסמה — שולח מייל עם קישור (לא חושף אם המייל קיים) */
const forgotPassword = async (req, res) => {
    const genericMessage =
        "אם כתובת המייל רשומה במערכת, נשלח אליך קישור לאיפוס הסיסמה. בדקי גם בתיקיית דואר זבל.";

    try {
        const { email } = req.body ?? {};
        if (!email || !String(email).trim()) {
            return res.status(400).send({ message: "נא למלא כתובת מייל" });
        }

        const emailNorm = String(email).trim().toLowerCase();
        const user = await User.findOne({
            $expr: { $eq: [{ $toLower: "$email" }, emailNorm] },
        }).lean();

        let resetUrl;
        let mailResult;

        if (user) {
            const rawToken = generateSecureToken(RESET_TOKEN_BYTES);
            const tokenHash = hashValue(rawToken);
            const expiresAt = new Date(Date.now() + RESET_EXPIRES_MS);

            await PasswordResetToken.deleteMany({ userId: user._id, usedAt: { $exists: false } });
            await PasswordResetToken.create({
                userId: user._id,
                tokenHash,
                expiresAt,
            });

            const userName =
                [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "משתמשת";
            resetUrl = `${clientBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;

            mailResult = await sendPasswordResetEmail({
                to: user.email,
                userName,
                resetUrl,
            });
        }

        const payload = { message: genericMessage };

        if (mailResult?.preview && resetUrl) {
            payload.smtpNotConfigured = true;
            payload.devResetUrl = resetUrl;
            payload.message =
                "המייל לא נשלח כי SMTP לא הוגדר בשרת. השתמשי בקישור למטה לאיפוס הסיסמה (מצב פיתוח).";
        }

        return res.status(200).send(payload);
    } catch (err) {
        console.error("[forgotPassword]", err?.message ?? err);
        return res.status(500).send({ message: "שגיאה בשליחת הבקשה. נסי שוב מאוחר יותר." });
    }
};

/** איפוס סיסמה באמצעות טוקן מהמייל */
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body ?? {};

        if (!token || !String(token).trim()) {
            return res.status(400).send({ message: "קישור האיפוס אינו תקין" });
        }
        if (!password || String(password).length < 6) {
            return res.status(400).send({ message: "סיסמה חדשה: לפחות 6 תווים" });
        }

        const tokenHash = hashValue(String(token).trim());
        const record = await PasswordResetToken.findOne({
            tokenHash,
            usedAt: { $exists: false },
            expiresAt: { $gt: new Date() },
        });

        if (!record) {
            return res.status(400).send({
                message: "הקישור פג תוקף או כבר נוצל. בקשי קישור חדש דרך «שכחתי סיסמה».",
            });
        }

        const user = await User.findById(record.userId).select("+password");
        if (!user) {
            return res.status(400).send({ message: "משתמש לא נמצא" });
        }

        user.password = String(password);
        await user.save();

        record.usedAt = new Date();
        await record.save();
        await PasswordResetToken.deleteMany({
            userId: user._id,
            _id: { $ne: record._id },
        });

        return res.status(200).send({ message: "הסיסמה עודכנה בהצלחה. אפשר להתחבר עם הסיסמה החדשה." });
    } catch (err) {
        console.error("[resetPassword]", err?.message ?? err);
        return res.status(500).send({ message: "שגיאה בעדכון הסיסמה" });
    }
};

function sanitizePublicProfileFields(user) {
    if (!user || typeof user !== "object") return user;
    const out = { ...user };
    if (typeof out.profileImage === "string") {
        const u = normalizeProfileImageUrl(out.profileImage);
        if (u && isAllowedProfileImageUrl(u)) {
            out.profileImage = u;
        } else {
            delete out.profileImage;
        }
    } else {
        delete out.profileImage;
    }
    return out;
}

/** רשימת רבנים/מרצים לבחירה בשאלות (בלי סיסמה וכו׳) */
const getPublicLecturers = async (req, res) => {
    try {
        /* מרצים מאושרים + ישנים ללא שדה accountStatus; לא ממתינים/נדחים */
        const data = await User.find(
            {
                status: "lecturer",
                accountStatus: { $nin: ["pending", "rejected"] },
            },
            { firstName: 1, lastName: 1, status: 1, userCode: 1, profileImage: 1 }
        )
            .sort({ lastName: 1, firstName: 1 })
            .lean();
        res.status(200).send(data.map(sanitizePublicProfileFields));
    } catch (err) {
        res.status(500).send(err);
    }
};

module.exports = {
    getAllUsers,
    getPublicLecturers,
    getUserById,
    addNewUser,
    loginUser,
    uploadProfileImage,
    forgotPassword,
    resetPassword,
    deleteUser,
    updateUser
};