import Service from "../models/service.model.js";
import type { IService } from "../types/service.type.js";

export default class ServiceRepository {
  listAll = async (): Promise<IService[]> => {
    const services = await Service.findAll({
      order: [["id", "ASC"]],
    });

    return services.map((service) => service.toJSON() as IService);
  };

  findByIds = async (ids: number[]): Promise<IService[]> => {
    const services = await Service.findAll({
      where: {
        id: ids,
      },
    });

    return services.map((service) => service.toJSON() as IService);
  };
}
