const { default: mongoose } = require("mongoose");
const bcrypt = require("bcrypt");

// mongoose לייבא את ספרית

const userSchema = new mongoose.Schema({

  userCode: {
    type: Number,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        return Number.isInteger(v) && v > 0;
      },
      message: props => `User code must be a positive number`
    }
  },

  firstName: {
    type: String,
    required: true,
    minlength: 2
  },

  lastName: {
    type: String,
    required: true,
    minlength: 2
  },

  status: {
    type: String,
    enum: ["manager", "lecturer", "student"],
    default: "student",
    required: true
  },

  /** אישור מנהלת — רלוונטי בעיקר לרב/מרצה */
  accountStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved",
  },

  phone: {
    type: String,
    validate: {
      validator: function (v) {
        return !v || /^[0-9]{9,10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number`
    }
  },

  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        return /^\S+@\S+\.\S+$/.test(v);
      },
      message: props => `${props.value} is not a valid email`
    }
  },

  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },

  profileImage: {
    type: String
  }

}, { timestamps: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
});


// למסד הנתונים הגדרת המודל עצמו
const User = mongoose.model('User', userSchema);

// ייצוא של המודל
module.exports = User;