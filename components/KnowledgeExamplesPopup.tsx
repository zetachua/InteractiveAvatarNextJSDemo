import { useState, useRef, useEffect } from "react";
import { baba_house } from "@/pages/api/constants";
import { Button } from "@nextui-org/button";

export default function KnowledgeExamplePopup() {
  const [popupOpen, setPopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setPopupOpen(false);
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
              <div>
                <h2 className="text-xl text-black font-semibold mb-4 capitalize">
                  BabaHouse Example
                </h2>
                <p className="text-gray-700">
                  <strong>Name:</strong> {baba_house.name}
                </p>
                <p className="text-gray-700 mt-3">
                  <strong>Tone:</strong> {baba_house.tone}
                </p>
                <p className="text-gray-700 mt-3">
                  <strong>Knowledge</strong> {baba_house.knowledge}
                </p>
               
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
