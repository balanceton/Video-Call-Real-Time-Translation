import React from "react";

function LanguageSelector({ selectedLanguage, setSelectedLanguage }) {
    const handleChange = (e) => {
      setSelectedLanguage(e.target.value);
    };
  
    return (
      <div>
        <label htmlFor="language-select">Select Language: </label>
        <select id="language-select" value={selectedLanguage} onChange={handleChange}>
        <option >Seçiniz</option>
          <option value="English">English</option>
          <option value="Turkish">Türkçe</option>
          <option value="Spanish">Español</option>
          <option value="French">Français</option>
          <option value="Arabic">العربية</option>
          <option value="Hindi">हिन्दी</option>
          <option value="German">Deutsch</option>
        </select>
      </div>
    );
  }
  

export default LanguageSelector;
