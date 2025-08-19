const parsePipeDetails = (text) => {
    const details = {
        colorGrade: text.match(/Color Grade: (\w+)/)?.[1],
        sizeType: text.match(/Size Type: ([\d.-]+ inch)/)?.[1],
        length: parseFloat(text.match(/Length: ([\d.]+)/)?.[1]),
        weight: parseFloat(text.match(/Weight: ([\d.]+)/)?.[1]),
        serialNumber: text.match(/Serial Number: (\w+)/)?.[1],
        price: parseFloat(text.match(/Price: ([\d.]+)/)?.[1]),
    };

    return details;
};

module.exports = parsePipeDetails;