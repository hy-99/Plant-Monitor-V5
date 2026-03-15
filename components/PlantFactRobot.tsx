import React, { useEffect, useMemo, useState } from 'react';
import BlobPalCompanion from './BlobPalCompanion';

const facts = [
  { title: 'Tiny Survival Story', text: 'Moss can look fully dried out, then bounce back after water like it never gave up.', footer: 'Plants can be stubborn in the best way.' },
  { title: 'Quiet Drama', text: 'A thirsty peace lily can collapse by evening, then stand back up after a good drink.', footer: 'Even plants have meltdown-and-recover days.' },
  { title: 'Underground Teamwork', text: 'Roots and fungi can trade nutrients underground in networks that help whole communities survive.', footer: 'The garden is more social than it looks.' },
  { title: 'Sun Chaser', text: 'Many houseplants slowly turn their leaves through the day to follow light.', footer: 'They really are paying attention.' },
  { title: 'Crowded Bloom', text: 'A sunflower head is made of hundreds of tiny flowers working as one giant bloom.', footer: 'Big beauty, tiny teamwork.' },
  { title: 'Built-In Cooling', text: 'Leaves release water vapor to cool themselves when the environment gets hot.', footer: 'A soft green version of keeping calm.' },
  { title: 'Rain Listener', text: 'Some roots respond to vibrations from moving water and grow toward the source.', footer: 'Plants can sense more than people assume.' },
  { title: 'Night Shift', text: 'Certain plants move more at night than in the day, folding leaves or repositioning for rest.', footer: 'Yes, your plant has a bedtime routine.' },
  { title: 'Fire Starter', text: 'Some seeds wait for fire or smoke signals before they finally germinate.', footer: 'A rough beginning can still trigger growth.' },
  { title: 'Color Trick', text: 'Purple-backed leaves can reflect light through leaf tissue and help with low-light efficiency.', footer: 'A little vanity, a lot of strategy.' },
  { title: 'Patient Climber', text: 'Pothos and philodendrons often produce larger leaves when they have support to climb.', footer: 'Confidence changes posture, even for vines.' },
  { title: 'Air Root Mood', text: 'Monsteras push out aerial roots to anchor, climb, and hunt for moisture in the air.', footer: 'Aerial roots look wild because they are working.' },
  { title: 'Recovery Fact', text: 'Plants often show stress days before permanent damage, which means timing your care matters more than perfection.', footer: 'Most plants want consistency, not miracles.' },
  { title: 'Memory Cue', text: 'A yellow leaf is not always a disaster. Older leaves naturally retire while new growth takes priority.', footer: 'Sometimes a plant is just reorganizing.' },
  { title: 'Humidity Gossip', text: 'Crispy leaf edges usually say more about air dryness and salts than about a single missed watering.', footer: 'Plants complain in patterns, not speeches.' },
  { title: 'Root Truth', text: 'Overwatering is often really an oxygen problem around roots, not just "too much water."', footer: 'Roots need air as much as moisture.' },
  { title: 'Soft Victory', text: 'A new unfurling leaf is one of the clearest signs your plant feels safe enough to keep growing.', footer: 'That is the plant version of trust.' },
  { title: 'Rescue Mode', text: 'Cuttings can form new roots from stems because plant cells stay surprisingly flexible.', footer: 'Plants are excellent at second chances.' },
  { title: 'Shade Intelligence', text: 'Fern-like plants often evolved to read tiny changes in moisture and filtered light under canopies.', footer: 'They are subtle, not fragile.' },
  { title: 'Season Check', text: 'Even indoor plants often slow down in winter because daylight length changes their growth rhythm.', footer: 'Less panic, more seasonal context.' },
];

type PlantFactRobotMood = 'warm' | 'curious' | 'excited' | 'sad';
type PlantFactRobotPlacement = 'floating' | 'inline';

interface PlantFactRobotProps {
  placement?: PlantFactRobotPlacement;
  title?: string;
  text?: string;
  footer?: string;
  moodOverride?: PlantFactRobotMood;
}

const useMinWidth = (minWidth: number) => {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= minWidth,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [minWidth]);

  return matches;
};

const homeClickLines = [
  'Lantern glow boosted.',
  'I can absolutely do another little orbit.',
  'The dashboard feels steadier already.',
  'Companion morale is currently excellent.',
  'That was the correct amount of greenhouse energy.',
] as const;

const authClickLines = [
  'I am helping with quiet login support.',
  'Tiny lantern nod. The form still looks good.',
  'I can do this all day if needed.',
  'A polite orbit flourish has occurred.',
  'Mood upgraded. Continue the form.',
] as const;

const mapMood = (mood: PlantFactRobotMood): 'idle' | 'happy' | 'shy' | 'sad' => {
  if (mood === 'excited') return 'happy';
  if (mood === 'curious') return 'shy';
  if (mood === 'sad') return 'sad';
  return 'idle';
};

const nextFactIndex = (current: number) => (current + 1 + Math.floor(Math.random() * (facts.length - 1))) % facts.length;

const PlantFactRobot: React.FC<PlantFactRobotProps> = ({
  placement = 'floating',
  title,
  text,
  footer,
  moodOverride,
}) => {
  const [index, setIndex] = useState(0);
  const [mood, setMood] = useState<PlantFactRobotMood>('warm');
  const canRenderFloating = useMinWidth(1280);

  if (placement === 'floating' && !canRenderFloating) {
    return null;
  }

  useEffect(() => {
    if (placement !== 'floating' || title || text || footer) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => nextFactIndex(current));
      setMood((current) => (current === 'warm' ? 'curious' : current === 'curious' ? 'excited' : 'warm'));
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [footer, placement, text, title]);

  useEffect(() => {
    if (!moodOverride) return;
    setMood(moodOverride);
  }, [moodOverride]);

  const fact = useMemo(
    () => ({
      title: title ?? facts[index].title,
      text: text ?? facts[index].text,
      footer: footer ?? facts[index].footer,
    }),
    [footer, index, text, title],
  );

  const handleActivate = () => {
    if (placement !== 'floating' || title || text || footer) {
      if (!moodOverride) {
        setMood((current) => (current === 'warm' ? 'curious' : current === 'curious' ? 'excited' : 'warm'));
      }
      return;
    }

    setIndex((current) => nextFactIndex(current));
    setMood((current) => (current === 'warm' ? 'curious' : current === 'curious' ? 'excited' : 'warm'));
  };

  return (
    <BlobPalCompanion
      mood={mapMood(moodOverride ?? mood)}
      title={fact.title}
      subtitle={fact.text}
      footer={placement === 'floating' ? undefined : fact.footer}
      bubbleLabel={placement === 'floating' ? 'plant pulse' : undefined}
      bubbleText={placement === 'floating' ? fact.text : fact.text}
      clickLines={placement === 'floating' ? homeClickLines : authClickLines}
      onActivate={handleActivate}
      scope={placement === 'floating' ? 'home' : 'auth'}
      placement={placement}
      ariaLabel={placement === 'floating' ? 'Plant companion with rotating facts' : 'Plant login companion'}
    />
  );
};

export default PlantFactRobot;
