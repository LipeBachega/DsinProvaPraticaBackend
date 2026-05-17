import { Sequelize } from 'sequelize';
import path from 'path';

// O SQLite vai criar um arquivo chamado 'database.sqlite' dentro da pasta src/config
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false, // Desative se os logs SQL poluírem demais o terminal
});

export default sequelize;