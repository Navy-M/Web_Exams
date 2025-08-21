import { 
    Disc_Test, 
    Clifton_Test, 
    Mbti_Test, 
    Holland_Test, 
    Gardner_Test,
    Ghq_Test, 
    PersonalFavorites_Test,
} from '../config/dummyData.js';


export const getTestQuestions = async (req, res, next) => {

  try {
    const { testType } = req.body;

    // console.log("test Type:", testType);

    if (!testType) {
      console.log("❌ Missing test Type");
      return res.status(400).json({ message: "testType required" });
    }
    
    let Q ;

    switch (testType) {
        case "MBTI":
          Q = Mbti_Test;
          break;
        case "DISC":
          Q = Disc_Test;
          break;
        case "HOLLAND":
          Q = Holland_Test;
          break;
        case "CLIFTON":
          Q = Clifton_Test;
          break;
        case "GARDNER":
          Q = Gardner_Test;
          break;
        case "GHQ":
          Q = Ghq_Test;
          break;
        case "PERSONAL_FAVORITES":
          Q = PersonalFavorites_Test;
          break;
        default:
          Q = [];
            break;
    }

    if (Q) {
        return res.json({
            message: "get tests Questions successfully",
            questions: Q,
        });
    }
    
  } catch (err) {
    console.error("💥 Server error in get Tests Questions:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};