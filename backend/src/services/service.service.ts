import type IResponse from "../types/response.type.js";
import type { IService } from "../types/service.type.js";
import ServiceRepository from "../repositories/service.repository.js";
import { formatBrazilDateTime } from "../utils/datetime.lib.js";

export default class ServiceService {
  private serviceRepository = new ServiceRepository();

  listAll = async (): Promise<IResponse<IService[]>> => {
    try {
      const services = await this.serviceRepository.listAll();

      return {
        status: 200,
        success: true,
        message: "Servicos listados com sucesso.",
        data: services.map((service) => this.serializeService(service)),
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message: "Erro interno no servidor ao listar servicos.",
        error: error.message,
      };
    }
  };

  private serializeService(service: IService): IService {
    const serializedService = { ...service } as IService & {
      createdAt?: string;
      updatedAt?: string;
    };

    if (serializedService.createdAt) {
      serializedService.createdAt = formatBrazilDateTime(
        serializedService.createdAt,
      );
    }

    if (serializedService.updatedAt) {
      serializedService.updatedAt = formatBrazilDateTime(
        serializedService.updatedAt,
      );
    }

    return serializedService;
  }
}
