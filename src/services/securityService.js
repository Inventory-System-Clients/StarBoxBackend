import SecurityControl from "../models/SecurityControl.js";

export const getSecurityState = async () => {
  let state = await SecurityControl.findByPk(1);

  if (!state) {
    state = await SecurityControl.create({ id: 1 });
  }

  return state;
};

export const toggleSystemLock = async () => {
  const state = await getSecurityState();
  state.isLocked = !state.isLocked;
  state.authVersion += 1;
  await state.save();
  return state;
};
