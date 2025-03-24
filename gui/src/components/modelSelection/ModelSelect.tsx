import { Listbox, Transition } from "@headlessui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  CubeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { defaultBorderRadius, lightGray } from "..";
import { useAuth } from "../../context/Auth";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import AddModelForm from "../../forms/AddModelForm";
import { useAppSelector } from "../../redux/hooks";
import {
  selectDefaultModel,
  setDefaultModel,
} from "../../redux/slices/configSlice";
import { setDialogMessage, setShowDialog } from "../../redux/slices/uiSlice";
import { fontSize, isMetaEquivalentKeyPressed } from "../../util";
import Shortcut from "../gui/Shortcut";
import { Divider } from "./platform/shared";

interface ModelOptionProps {
  option: Option;
  idx: number;
  showMissingApiKeyMsg: boolean;
  isSelected?: boolean;
}

interface Option {
  value: string;
  title: string;
  apiKey?: string;
}

const StyledListboxButton = styled(Listbox.Button)`
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 2px;
  border: none;
  cursor: pointer;
  font-size: ${fontSize(-3)};
  background: transparent;
  color: ${lightGray};
  &:focus {
    outline: none;
  }
`;

const StyledListboxOption = styled(Listbox.Option)<{ isDisabled?: boolean }>`
  border-radius: ${defaultBorderRadius};
  padding: 4px 12px;

  ${({ isDisabled }) =>
    !isDisabled &&
    `
    cursor: pointer;

    &:hover {
      background: ${lightGray}33;
    }
  `}

  ${({ isDisabled }) =>
    isDisabled &&
    `
    opacity: 0.5;
  `}
`;

const IconBase = styled.div<{ $hovered: boolean }>`
  width: 1.2em;
  height: 1.2em;
  cursor: pointer;
  padding: 4px;
  border-radius: ${defaultBorderRadius};
  opacity: ${(props) => (props.$hovered ? 0.75 : 0)};
  visibility: ${(props) => (props.$hovered ? "visible" : "hidden")};

  &:hover {
    opacity: 1;
    background-color: ${lightGray}33;
  }
`;

const StyledCog6ToothIcon = styled(IconBase).attrs({ as: Cog6ToothIcon })``;

function modelSelectTitle(model: any): string {
  if (model?.title) return model?.title;
  if (model?.model !== undefined && model?.model.trim() !== "") {
    if (model?.class_name) {
      return `${model?.class_name} - ${model?.model}`;
    }
    return model?.model;
  }
  return model?.class_name;
}

function ModelOption({
  option,
  idx,
  showMissingApiKeyMsg,
  isSelected,
}: ModelOptionProps) {
  const ideMessenger = useContext(IdeMessengerContext);

  const [hovered, setHovered] = useState(false);

  function onClickGear(e: any) {
    e.stopPropagation();
    e.preventDefault();

    ideMessenger.post("config/openProfile", { profileId: undefined });
  }

  function handleOptionClick(e: any) {
    if (showMissingApiKeyMsg) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <StyledListboxOption
      key={idx}
      value={option.value}
      isDisabled={showMissingApiKeyMsg}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleOptionClick}
    >
      <div className="flex w-full flex-col gap-0.5">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-grow items-center">
            <CubeIcon className="mr-2 h-3 w-3 flex-shrink-0" />
            <span className="flex-grow">
              {option.title}
              {showMissingApiKeyMsg && (
                <span className="ml-2 text-[10px] italic">
                  (Missing API key)
                </span>
              )}
            </span>
          </div>
          <div className="ml-5 flex items-center">
            <StyledCog6ToothIcon $hovered={hovered} onClick={onClickGear} />
            {isSelected && <CheckIcon className="ml-1 h-3 w-3" />}
          </div>
        </div>
      </div>
    </StyledListboxOption>
  );
}

function ModelSelect() {
  const dispatch = useDispatch();
  const defaultModel = useAppSelector(selectDefaultModel);
  const allModels = useAppSelector((state) => state.config.config.models);
  const [showAbove, setShowAbove] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [sortedOptions, setSortedOptions] = useState<Option[]>([]);
  const { selectedProfile } = useAuth();

  // Sort so that options without an API key are at the end
  useEffect(() => {
    const enabledOptions = options.filter((option) => option.apiKey !== "");
    const disabledOptions = options.filter((option) => option.apiKey === "");

    const sorted = [...enabledOptions, ...disabledOptions];

    setSortedOptions(sorted);
  }, [options]);

  useEffect(() => {
    setOptions(
      allModels
        .filter((m) => !m.roles || m.roles.includes("chat"))
        .map((model) => {
          return {
            value: model.title,
            title: modelSelectTitle(model),
            apiKey: model.apiKey,
          };
        }),
    );
  }, [allModels]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "'" && isMetaEquivalentKeyPressed(event as any)) {
        const direction = event.shiftKey ? -1 : 1;
        const currentIndex = options.findIndex(
          (option) => option.value === defaultModel?.title,
        );
        let nextIndex = (currentIndex + 1 * direction) % options.length;
        if (nextIndex < 0) nextIndex = options.length - 1;
        const newModelTitle = options[nextIndex].value;
        dispatch(setDefaultModel({ title: newModelTitle }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [options, defaultModel]);

  function onClickAddModel(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    // Close the dropdown
    if (buttonRef.current) {
      buttonRef.current.click();
    }
    dispatch(setShowDialog(true));
    dispatch(
      setDialogMessage(
        <AddModelForm
          onDone={() => {
            dispatch(setShowDialog(false));
          }}
        />,
      ),
    );
  }

  return (
    <Listbox
      onChange={async (val: string) => {
        if (val === defaultModel?.title) return;
        dispatch(setDefaultModel({ title: val }));
      }}
    >
      {({ open }) => (
        <div className="relative">
          <StyledListboxButton
            data-testid="model-select-button"
            ref={buttonRef}
            className="h-[18px] overflow-hidden p-0"
            style={{ padding: 0 }}
            // onClick={reCalculate}
          >
            <div className="flex items-center gap-0.5 text-gray-400 transition-colors duration-200">
              <span className="truncate">
                {modelSelectTitle(defaultModel) || "Select model"}{" "}
              </span>
              <ChevronDownIcon
                className="h-3 w-3 flex-shrink-0"
                aria-hidden="true"
              />
            </div>
          </StyledListboxButton>
          <Transition
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
            // afterLeave={afterLeave}
          >
            <Listbox.Options
              className={
                "no-scrollbar border-lightgray bg-vsc-input-background absolute z-50 mt-1 flex cursor-default list-none flex-col overflow-auto whitespace-nowrap rounded-sm border-[0.5px] border-solid p-0"
              }
              style={{
                fontSize: fontSize(-3),
              }}
            >
              <div className={`no-scrollbar max-h-[300px] overflow-y-scroll`}>
                {sortedOptions.map((option, idx) => (
                  <ModelOption
                    option={option}
                    idx={idx}
                    key={idx}
                    showMissingApiKeyMsg={option.apiKey === ""}
                    isSelected={option.value === defaultModel?.title}
                  />
                ))}
              </div>

              <div className="mt-auto">
                <Divider className="!my-0" />

                {selectedProfile?.profileType === "local" && (
                  <>
                    <StyledListboxOption
                      key={options.length}
                      onClick={onClickAddModel}
                      value={"addModel" as any}
                    >
                      <div className="flex items-center py-0.5">
                        <PlusIcon className="mr-2 h-3 w-3" />
                        Add Chat model
                      </div>
                    </StyledListboxOption>
                  </>
                )}

                <Divider className="!my-0" />

                <span className="block px-3 py-2" style={{ color: lightGray }}>
                  <Shortcut>meta '</Shortcut> to toggle model
                </span>
              </div>
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}

export default ModelSelect;
