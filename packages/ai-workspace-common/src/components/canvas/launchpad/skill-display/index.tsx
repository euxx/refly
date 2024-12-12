import { IconDown } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';
import { useSkillStoreShallow } from '@refly-packages/ai-workspace-common/stores/skill';
import { getPopupContainer } from '@refly-packages/ai-workspace-common/utils/ui';
import { SkillAvatar } from '@refly-packages/ai-workspace-common/components/skill/skill-avatar';
import { useEffect, useRef, useMemo } from 'react';
import { SearchList } from '@refly-packages/ai-workspace-common/modules/entity-selector/components';
import { useListSkills } from '@refly-packages/ai-workspace-common/queries';
import { Skill } from '@refly-packages/ai-workspace-common/requests/types.gen';

export const SkillDisplay = () => {
  const { t } = useTranslation();
  const skillStore = useSkillStoreShallow((state) => ({
    setSelectedSkill: state.setSelectedSkill,
    setSkillManagerModalVisible: state.setSkillManagerModalVisible,
  }));

  const skillDisplayRef = useRef<HTMLDivElement>(null);

  const popupContainer = useMemo(() => getPopupContainer(), []);

  const { data } = useListSkills();
  const { data: skills } = data || {};

  const containCnt = 3;

  const skillItems = useMemo(() => {
    return skills?.map((item, index) => (
      <div
        key={item?.name || index}
        className={`skill-item ${index >= containCnt ? 'hide' : ''}`}
        onClick={() => {
          skillStore.setSelectedSkill(item);
        }}
      >
        <SkillAvatar
          noBorder
          size={20}
          icon={item?.icon}
          displayName={t(`${item?.name}.name`, { ns: 'skill' })}
          background="transparent"
        />
        <span className="skill-item-title">{t(`${item?.name}.name`, { ns: 'skill' })}</span>
      </div>
    ));
  }, [skills, containCnt, skillStore.setSelectedSkill]);

  const searchListComponent = useMemo(
    () => (
      <SearchList
        domain={'skill'}
        trigger="hover"
        mode="single"
        handleConfirm={(items) => {
          skillStore.setSelectedSkill(items[0].metadata?.originalItem as Skill);
        }}
      >
        <div
          key="more"
          className="skill-item group"
          onClick={() => {
            skillStore.setSkillManagerModalVisible(true);
          }}
        >
          <IconDown className="transform transition-transform duration-300 ease-in-out group-hover:rotate-180" />
        </div>
      </SearchList>
    ),
    [skillStore.setSkillManagerModalVisible, popupContainer],
  );

  return (
    <div className="skill-container" ref={skillDisplayRef}>
      {skillItems}
      {searchListComponent}
    </div>
  );
};
