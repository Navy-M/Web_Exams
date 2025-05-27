import Test from '../models/Test.js';
import User from '../models/User.js';
import UserTest from '../models/UserTest.js';


export const createTest = async (req, res) => {
  try {
    const { name, description, questions } = req.body;
    
    const test = await Test.create({
      name,
      description,
      questions,
      createdBy: req.user._id
    });

    res.status(201).json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const assignTest = async (req, res) => {
  try {
    const { testId, userIds, deadline } = req.body;
    
    const test = await Test.findByIdAndUpdate(
      testId,
      { 
        $addToSet: { 
          assignedTo: { 
            $each: userIds.map(userId => ({ 
              user: userId, 
              deadline 
            })) 
          } 
        } 
      },
      { new: true }
    );

    await User.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { testsAssigned: testId } }
    );

    res.json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getTestResults = async (req, res) => {
  try {
    const results = await UserTest.find({ test: req.params.testId })
      .populate('user', 'email profile')
      .populate('test', 'name');
    
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};