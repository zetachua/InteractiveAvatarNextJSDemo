interface AudioAnalyticsDescriptionProps {
  metric: string;
  value: number;
};

const AudioAnalyticsDescription: React.FC<AudioAnalyticsDescriptionProps> = ({
  metric,
  value
}) => {
  const compareArousal = (value: number) => {
    if (value < 63.9) {
      return 'Try to speak with more enthusiasm!'
    }
    if (value < 67.2) {
      return 'You did better than LookUp and MediVR but worse than ConcreteAI. Keep up the good work!'
    }
    if (value < 70.3) {
      return 'Amazing! You did better than ConcreteAI, LookUp and MediVR but fall short to Granted.'
    }
    return 'Superb arousal. You clean sweeped all 4 seniors.'
  };

  const compareDominance = (value: number) => {
    if (value < 68.1) {
      return 'Try to sound more confident and in control!'
    }
    if (value < 71.5) {
      return 'You did better than LookUp and ConcreteAI but worse than MediVR. Keep up the good work!'
    }
    if (value < 73.3) {
      return 'Amazing! You did better than ConcreteAI, LookUp and MediVR but fall short to Granted.'
    }
    return 'Wow! Great control of voice! You beat all seniors.'
  };

  const compareValence = (value: number) => {
    if (value < 52.9) {
      return 'Cheer up! You need to display cheerfulness to increase your valence.'
    }
    if (value < 64.7) {
      return 'You did better than Granted and LookUp but worse than MediVR. Keep up the good work!'
    }
    if (value < 67.7) {
      return 'Amazing! You did better than Granted, LookUp and MediVR but fall short to ConcreteAI.'
    }
    return 'You displayed exceptional valence, beating all 4 seniors!'
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(200, 200, 200)',
        padding: '10px',
        color: 'black',
        borderRadius: '5px',
        width: '300%',
        textAlign: 'center'
      }}
    >
      {metric === 'arousal' && <div>
        <b>Arousal</b> measures the intensity of your emotion, ranging from calm to excited.
        <p>{compareArousal(value)}</p>
      </div>}
      {metric === 'dominance' && <div>
        <b>Dominance</b> measures the control, or authority in a situation, ranging from submissive to dominant.
        <p>{compareDominance(value)}</p>
      </div>}
      {metric === 'valence' && <div>
        <b>Valence</b> measures the pleasantness or unpleasantness of an emotion, ranging from negative to positive.
        <p>{compareValence(value)}</p>
      </div>}
    </div>
  );
};
export default AudioAnalyticsDescription;