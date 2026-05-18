import Service from "../models/service.model.js";
import type { IService } from "../types/service.type.js";

export default class ServiceRepository {
  listAll = async (): Promise<IService[]> => {
    // A ordenacao por ID mantem a exibicao previsivel para interface e testes.
    const services = await Service.findAll({
      order: [["id", "ASC"]],
    });

    return services.map((service) => service.toJSON() as IService);
  };

  findByIds = async (ids: number[]): Promise<IService[]> => {
    // Esta consulta sustenta a validacao de existencia e o calculo de duracao total.
    const services = await Service.findAll({
      where: {
        id: ids,
      },
    });

    return services.map((service) => service.toJSON() as IService);
  };
}
