const Pipe = require("../models/Pipe");

const generateSerialNumber = async () => {
    const monthNames = ["JA", "FE", "MR", "AP", "MA", "JN", "JL", "AU", "SE", "OC", "NO", "DE"];
    const currentMonth = new Date().getMonth();
    const monthPrefix = monthNames[currentMonth];

    const latestPipe = await Pipe.findOne(
        { serialNumber: { $regex: `^${monthPrefix}` } }, // Find pipes with serialNumber starting with monthPrefix
    ).sort({ serialNumber: -1 }); 
    let sequenceNumber = 1;
    if (latestPipe) {
        const latestSequence = parseInt(latestPipe.serialNumber.slice(2), 10);
        sequenceNumber = latestSequence + 1;
    }

    const formattedSequence = sequenceNumber.toString().padStart(3, "0");
    return `${monthPrefix}${formattedSequence}`;
};

module.exports = generateSerialNumber;