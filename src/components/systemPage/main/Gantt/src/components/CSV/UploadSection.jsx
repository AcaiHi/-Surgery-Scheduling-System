import React from "react";

function UploadSection({ onFileUpload }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryString = event.target.result;
        const utf8String = new TextDecoder("utf-8").decode(new TextEncoder("UTF-8").encode(binaryString));
        onFileUpload(utf8String);
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  return (
    <div className="upload-section">
      <h2>請上傳 CSV 檔案</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
    </div>
  );
}

export default UploadSection;