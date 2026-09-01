import jakarta.enterprise.context.ApplicationScoped;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.component.kafka.KafkaConstants;

@ApplicationScoped
public class MyRoute extends RouteBuilder {

    @Override
    public void configure() throws Exception {
        errorHandler(deadLetterChannel("kafka:{{route.dlq-topic}}")
            .maximumRedeliveries(3)
            .redeliveryDelay(1000)
            .useOriginalMessage());

        from("kafka:{{route.input-topic}}?groupId={{route.group-id}}")
            .routeId("my-route")
            .log("Processing: ${headerAs('" + KafkaConstants.KEY + "',String)}")
            .bean(MyProcessor.class, "process")
            .to("kafka:{{route.output-topic}}")
                .id("output");
    }
}
