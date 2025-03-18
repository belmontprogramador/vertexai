const { validateStageProgression, getStageFromUserInput } = require("../../Services/salesStages");
const { setUserStage } = require("../../Services/redisService");

const handleStageProgression = async (userId, userInput, userStage, historyText) => {
    let detectedStage = getStageFromUserInput(userInput, userStage);

    if (detectedStage !== userStage) {
        userStage = await validateStageProgression(userId, detectedStage, userStage);
        await setUserStage(userId, userStage);
    }

    return userStage;
};

module.exports = { handleStageProgression };
