import { useState, useRef, useEffect } from "react";
import { kaching, hypha_alpha } from "@/pages/api/constants";
import { Button } from "@nextui-org/button";

export default function StartupPopup() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<"kaching" | "hypha_alpha" | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const startupData = {
    kaching,
    hypha_alpha,
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setPopupOpen(false);
        setSelectedStartup(null);
      }
    };

    if (popupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popupOpen]);

  return (
    <div className="flex flex-col items-center justify-center"
      style={{top:'-3rem',right:'0rem',position:'absolute',zIndex:'10'}}>
     
      <Button
        className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
        size="md"
        variant="shadow"
        onClick={() => setPopupOpen(true)}
      >
          View Examples
        </Button>

      {popupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div
            ref={popupRef}
            className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full max-h-[70vh] overflow-y-auto"
            style={{width:'620px'}}
          >
            {!selectedStartup ? (
              // Startup Selection Menu
              <div style={{display:'flex',flexDirection:'column',gap:'1.5rem',margin:'0.5rem'}}>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                  size="md"
                  variant="shadow"
                  onClick={() => setSelectedStartup("kaching")}
                >
                  Kaching Description
                </Button>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                  size="md"
                  variant="shadow"
                  onClick={() => setSelectedStartup("hypha_alpha")}
                >
                  Hypha Alpha Description
                </Button>
              </div>
            ) : (
              // Display Selected Report
              <div>
                <h2 className="text-xl text-black font-semibold mb-4 capitalize">
                  {selectedStartup.replace("_", " ")}
                </h2>
                <p className="text-gray-700">
                  <strong>Startup Idea:</strong> {startupData[selectedStartup].startup_idea}
                </p>
                <p className="text-gray-700 mt-3">
                  <strong>Hypothesis:</strong> {startupData[selectedStartup].hypothesis}
                </p>
                <p className="text-gray-700 mt-3">
                  <strong>Target Audience:</strong> {startupData[selectedStartup].target_audience}
                </p>
                <Button
                  onClick={() => setSelectedStartup(null)}
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white mt-4"
                >
                  Back to Selection
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
