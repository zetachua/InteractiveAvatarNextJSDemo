import React from 'react';
import {
  AssessmentType,
  PronunciationAssessment
} from './KnowledgeClasses';

interface AssessmentProps {
  assessment: AssessmentType;
  pronunciationAssessment: PronunciationAssessment;
};

const Assessment: React.FC<AssessmentProps> = ({
  assessment,
  pronunciationAssessment,
}) => {
  const renderContent = () => {
    switch (assessment) {
      case 'Pronunciation':
        return (
          <>
            <div>
              {renderScore(pronunciationAssessment.score)}
            </div>
            <div>

            </div>
          </>
        );

      case 'Intonation':
        return (
          <>

          </>
        );

      case 'Fluency':
        return (
          <>

          </>
        );

      default:
        return <>No assessment selected.</>;
    }
  };

  const renderScore = (score: number) => {
    let grade = "Undefined";
    let color = "#7F8C8D";

    if (score < 38) {
      grade = "Beginner";
      color = "#DC7633";
    } else if (score < 49) {
      grade = "Elementary";
      color = "#EB984E";
    } else if (score < 62) {
      grade = "Intermediate";
      color = "#F5B041";
    } else if (score < 76) {
      grade = "Upper Intermediate";
      color = "#F4D03F";
    } else if (score < 86) {
      grade = "Advanced";
      color = "#58D68D";
    } else if (score <= 100) {
      grade = "Fluent";
      color = "#52BE80";
    }

    return (
      <div className='meter'>
        <div
          className='progress'
          style={{ '--i': score, '--clr': color } as React.CSSProperties }
        >
          <h3>{score}</h3>
          <h4>{grade}</h4>
        </div>
      </div>
    );
  };

  return (
    <div className='assessment'>
      {renderContent()}
    </div>
  );
};

export default Assessment;